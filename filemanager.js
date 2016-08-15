
const filetreeid = 'fmtree'
const path_prefix = "translations/texts"
const fold_icon = "<path d=\"M13 4H7V3c0-.66-.31-1-1-1H1c-.55 0-1 .45-1" +
  " 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1V5c0-.55-.45-1-1-1zM6 4H1V3h5" +
  "v1z\"></path>"
const file_icon = "<path d=\"M6 5H2V4h4v1zM2 8h7V7H2v1zm0 2h7V9H2v1zm0 " +
  "2h7v-1H2v1zm10-7.5V14c0 .55-.45 1-1 1H1c-.55 0-1-.45-1-1V2c0-.55.45-" +
  "1 1-1h7.5L12 4.5zM11 5L8 2H1v12h10V5z\"></path>"
const svg_template = "<svg aria-hidden=\"true\" class=\"octicon\" " +
"height=\"16\" version=\"1.1\" viewBox=\"0 0 14 16\" width=\"14\">"

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
  if (type == "dir")
  {
    img.innerHTML = svg_template + fold_icon + "</svg>"
  }
  else
  {
    img.innerHTML = svg_template + file_icon + "</svg>"
  }
  img.className = "img-responsive"
  img.style.width = 14
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
  this.track(path)
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
    add_file(fm.table, "..", "dir",function()
      {
        fm.goto_path(prev_path)
      })
  }
  function make_pb_request(pbid, path)
  {
    return function(w){ w.postMessage({name: "getstatus",
          id: pbid,
          path: path})}
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
  this.account.getJSON(this.account.get_repo_suffix() + "contents/" + path + '?ref=' +
    this.account.branch,
    function(json){
      fm.update_tree(json, path)
    })
}

FileManager.prototype.goto_home = function ()
{
  this.goto_path(path_prefix)
}


