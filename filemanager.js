
const filetreeid = 'fmtree'
const api_prefix = "https://api.github.com/repos/xomachine"+
  "/Starbound_RU/contents/translations"
const branch = "web-interface-tests"

function prepare_fm(holder)
{
  var tracker = document.createElement('table')
  tracker.createTBody()
  tracker.insertRow()
  tracker.setAttribute('id', "fmtracker")
  tracker.setAttribute('height', "10%")
  var table = document.createElement('table')
  table.className = "files"
  table.setAttribute("id", filetreeid)
  table.style.border = '1px solid black'
  //tbody = document.createElement('tbody')
  //table.appendChild(tbody)
  table.createTBody()
  holder.appendChild(tracker)
  holder.appendChild(table)
  return table
}

const fold_icon = "<path d=\"M13 4H7V3c0-.66-.31-1-1-1H1c-.55 0-1 .45-1" +
  " 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1V5c0-.55-.45-1-1-1zM6 4H1V3h5" +
  "v1z\"></path>"
const file_icon = "<path d=\"M6 5H2V4h4v1zM2 8h7V7H2v1zm0 2h7V9H2v1zm0 " +
  "2h7v-1H2v1zm10-7.5V14c0 .55-.45 1-1 1H1c-.55 0-1-.45-1-1V2c0-.55.45-" +
  "1 1-1h7.5L12 4.5zM11 5L8 2H1v12h10V5z\"></path>"
const svg_template = "<svg aria-hidden=\"true\" class=\"octicon\" " +
"height=\"16\" version=\"1.1\" viewBox=\"0 0 14 16\" width=\"14\">"
function add_file(table, name, type, on_click)
{
  var row = table.insertRow()
  row.className = "js-navigation-item"
  var img = row.insertCell()
  if (type == "dir")
  {
    img.innerHTML = svg_template + fold_icon + "</svg>"
  }
  else
  {
    img.innerHTML = svg_template + file_icon + "</svg>"
  }
  img.className = "icon"
  img.style.width = 14
  var link = row.insertCell()
  link.className = "content"
  var compliteon = row.insertCell()
  var thelink = document.createElement('a')
  thelink.className = "css-truncate"
  thelink.title = name
  thelink.innerHTML = name
  thelink.onclick = on_click
  
  link.appendChild(thelink)
}


function track(path)
{
  var parts = path.split('/')
  var tracker = document.getElementById('fmtracker')
  var newcell = tracker.rows[0].insertCell()
  var link = document.createElement('a')

  newcell.appendChild(link)
}

function update_tree(file_json, on_file, path)
{
  var table = document.getElementById(filetreeid)
  if (!($.isArray(file_json)))
  {
    on_file(file_json)
    return
  }
  /*for(var i = 0; i <table.rows.length; i++)
  {
    table.deleteRow(i -1);
  }*/
  $.each(table.getElementsByTagName('tbody'),
    function(i, b){
      b.innerHTML = ""
    })

  var offset = path.lastIndexOf("/")
  if (offset >= api_prefix.length - 1)
  {
    var prev_path = path.slice(0,offset)
    offset = path.lastIndexOf("?")
    if (offset != -1)
    {
      prev_path = prev_path + path.slice(offset)
    }
    add_file(table, "..", "dir",function()
      {
        goto_path(prev_path, on_file)
      })
  }
    
  $.each(file_json, function(i, e)
    {
      if (e.size >= 1024000)
      {return}
      add_file(table, e.name, e.type, function()
        {
          goto_path(e.url, on_file)
        })
    })
  
}



function goto_path(path, on_file)
{
  
  $.getJSON(path,
    function(json){
      update_tree(json, on_file, path)
    })

}

function goto_home( on_file)
{
  goto_path(api_prefix + "?ref=" + branch, on_file)
}
