
const filetreeid = 'fmtree'
const path_prefix = "translations/texts"

function FileManager(holder, navigator, account, on_file)
{
  this.holder = holder
  this.navigator = navigator
  this.table = {}
  this.table = document.createElement('table')
  this.table.className = "table table-responsive table-hover"
  this.table.setAttribute("id", filetreeid)
  this.table.createTBody()
  this.holder.appendChild(this.table)
  this.account = account
  this.on_file = on_file
}


function add_file(table, name, type, on_click)
{
  var row = table.insertRow()
  var img = row.insertCell()
  var glyph = {
    "dir": "folder-open",
    "file": "list-alt",
    "up": "level-up"
  }
  img.innerHTML = "<span class='glyphicon glyphicon-" + glyph[type] + "'></span>"
  img.className = "img-responsive"
  img.style.width = 16
  var link = row.insertCell()
  link.className = "container"
  var completion = row.insertCell()

  var complindicator = document.createElement('div')
  var complframe = document.createElement('div')
  complframe.style["margin-bottom"] = 0
  complframe.className = 'progress'
  complindicator.className = 'progress-bar progress-bar-success'
  complindicator.id = "progress-" + name
  complindicator.setAttribute('role', 'progressbar')
  complindicator.setAttribute('aria-valuemin', 0)
  complindicator.setAttribute('aria-valuemax', 100)
  complindicator.setAttribute('aria-valuenow', 0)
  complindicator.style.width =  "0%"
  complframe.appendChild(complindicator)
  completion.appendChild(complframe)

  completion.className = 'container'

  var thelink = document.createElement('a')
  thelink.className = ""
  thelink.title = name
  thelink.innerHTML = name
  row.onclick = on_click

  link.appendChild(thelink)
  return complindicator.id
}



FileManager.prototype.track = function(path)
{
  var fm = this
  let parts = path.slice(path_prefix.length).split('/')
  var curparts = $(this.navigator).children().toArray()
  function make_link(thepath, i)
  {
    var offset = path_prefix.length
    for (k=i;k >= 0;k--)
      offset = thepath.indexOf('/', offset) + 1
    if (offset == 0)
      offset = thepath.length
    let reduced = thepath.slice(0, offset)
    return function()
    {
      fm.goto_path(reduced)
    }
  }
  for (i in parts)
  {
    if (parts[i].length == 0)
      parts[i] = 'Корень'
    if (curparts.length <= i)
    {
      $(this.navigator).append('<li>'+parts[i]+'</li>').children().last()
        .on('click', make_link(path, i))
      continue
    }
    if ($(curparts[i]).text() != parts[i])
      $(curparts[i]).text(parts[i])

    $(curparts[i]).removeClass('active')
  }
  $(this.navigator).children().slice(parts.length).remove()
  $(this.navigator).children().last().addClass('active')
}

FileManager.prototype.update_tree = function (file_json, path)
{
  var fm = this
  if (!($.isArray(file_json)))
  {
    this.on_file(file_json)
    return
  }
  if (path.length == 0)
  {
    this.track(path)
  }
  $(this.table).find('tbody').html('')

  var offset = path.lastIndexOf("/")
  if (offset >= path_prefix.length - 1)
  {
    var prev_path = path.slice(0,offset)
    offset = path.lastIndexOf("?")
    if (offset != -1)
    {
      prev_path = prev_path + path.slice(offset)
    }
    add_file(fm.table, "..", "up",function()
      {
        fm.goto_path(prev_path)
      })
  }
  function make_pb_request(pbid, epath)
  {
    return function(w){ w.postMessage({name: "getstatus",
          id: pbid,
          path: epath})}
  }
  $.each(file_json, function(i, e)
    {
      if (e.size >= 1024000)
      {return}
      pbid = add_file(fm.table, e.name, e.type, function()
        {
          fm.goto_path(e.path)
        })
      theStatusUpdater.promise.then(make_pb_request(pbid, e.path))
    })
}

FileManager.prototype.goto_path = function (path)
{
  var fm = this
  if (!this.account)
  {
    this.on_file(path)
  }
  this.account.getJSON(this.account.get_repo_suffix() + "contents/" + path + '?ref=' +
    this.account.branch).then(
    function(json){
      fm.update_tree(json, path)
    })
}

FileManager.prototype.goto_home = function ()
{
  this.goto_path(path_prefix)
}


