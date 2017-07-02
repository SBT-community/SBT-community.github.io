"use strict";
const path_prefix = "translations/texts"

function FileManager(holder, navigator, account, on_file)
{
  this.holder = holder
  this.navigator = navigator
  this.table = document.createElement('table')
  this.table.className = "table table-responsive table-hover"
  this.table.id = holder.id + "-fmtree"
  this.table.createTBody()
  this.holder.appendChild(this.table)
  this.account = account
  this.on_file = on_file
  let fm = this
  if(navigator)
    $(window).bind("popstate", function (wevent) {
      let event = wevent.originalEvent
      if(event.state.path && event.state.json) {
        $(fm.table).find('tbody').html('')
        fm.updateTree(event.state.json, event.state.path)
        if(event.state.file_json)
          fm.on_file(event.state.file_json)
      }
    })
}


FileManager.prototype.addFile = function(name, type, on_click)
{
  let row = this.table.insertRow()
  let img = row.insertCell()
  let glyph = {
    "dir": "folder-open",
    "file": "list-alt",
    "up": "level-up"
  }
  img.innerHTML = "<span class='glyphicon glyphicon-" + glyph[type] + "'></span>"
  img.className = "img-responsive"
  img.style.width = 16
  let link = row.insertCell()
  link.className = "container"
  let completion = row.insertCell()

  let complindicator = document.createElement('div')
  let complframe = document.createElement('div')
  complframe.style["margin-bottom"] = 0
  complframe.className = 'progress'
  complindicator.className = 'progress-bar progress-bar-success'
  complindicator.id = this.holder.id + "-progress-" + name.replace(/[\s\./]/g, '-')
  complindicator.setAttribute('role', 'progressbar')
  complindicator.setAttribute('aria-valuemin', 0)
  complindicator.setAttribute('aria-valuemax', 100)
  complindicator.setAttribute('aria-valuenow', 0)
  complindicator.style.width =  "0%"
  complframe.appendChild(complindicator)
  completion.appendChild(complframe)

  completion.className = 'container'

  let thelink = document.createElement('a')
  thelink.className = ""
  thelink.title = name
  thelink.innerHTML = name
  row.onclick = on_click

  link.appendChild(thelink)
  return complindicator.id
}



FileManager.prototype.track = function(path)
{
  let fm = this
  let parts = path.slice(path_prefix.length).split('/')
  let curparts = $(this.navigator).children().toArray()
  function makeLink(thepath, i)
  {
    let offset = path_prefix.length
    for (let k=i;k >= 0;k--)
      offset = thepath.indexOf('/', offset) + 1
    if (offset == 0)
      offset = thepath.length
    let reduced = thepath.slice(0, offset)
    return function()
    {
      fm.gotoPath(reduced)
    }
  }
  for (let i in parts)
  {
    if (parts[i].length == 0)
      parts[i] = 'Корень'
    if (curparts.length <= i)
    {
      $(this.navigator).append('<li>'+parts[i]+'</li>').children().last()
        .on('click', makeLink(path, i))
      continue
    }
    if ($(curparts[i]).text() != parts[i])
      $(curparts[i]).text(parts[i])

    $(curparts[i]).removeClass('active')
  }
  $(this.navigator).children().slice(parts.length).remove()
  $(this.navigator).children().last().addClass('active')
}

FileManager.prototype.updateTree = function (file_json, path)
{
  let fm = this
  if (path.length > 0)
  {
    this.track(path)
  }
  let offset = path.lastIndexOf("/")
  if (offset >= path_prefix.length - 1)
  {
    let prev_path = path.slice(0,offset)
    offset = path.lastIndexOf("?")
    if (offset != -1)
    {
      prev_path = prev_path + path.slice(offset)
    }
    fm.addFile( "..", "up",function()
      {
        fm.gotoPath(prev_path)
      })
  }
  $.each(file_json, function(i, e)
    {
      if (e.size >= 1024000)
      {return}
      let pbid = fm.addFile(e.name, e.type, function()
        {
          fm.gotoPath(e.path)
        })
      theWorker.justSend("getstatus", {id:pbid, path:e.path})
    })
}

FileManager.prototype.gotoPath = function (path)
{
  this.gotoAdvancedPath(path, "track")
}
FileManager.prototype.gotoAdvancedPath = function(path, tracking)
{
  let fm = this
  path = path.replace(/\/$/, "")
  let pusher = history.pushState
  if(tracking == "replace") pusher = history.replaceState
  else if (tracking == "none") pusher = function (){}
  if (!this.account)
  {
    this.on_file(path)
    return
  }
  this.account.getJSON(this.account.get_repo_suffix() + "contents/"
                              + path + '?ref=' + this.account.branch)
    .then(function(json){
      if (!($.isArray(json)))
      {
        fm.gotoAdvancedPath(path.replace(/\/[^\/]+$/, ""), "none")
        fm.on_file(json)
        pusher.call(history, {
          path: path,
          json: history.state.json,
          file_json: json,
          }, "Интерфейс переводчика", "?open=" + path)
        return
      }
      pusher.call(history, {
        path: path,
        json: json,
        file_json: false,
        }, "Интерфейс переводчика", "?open=" + path)
      $(fm.table).find('tbody').html('')
      fm.updateTree(json, path)
    })
}

FileManager.prototype.gotoHome = function ()
{
  this.gotoAdvancedPath(path_prefix, "replace")
}

