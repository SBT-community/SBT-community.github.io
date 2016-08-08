
var totalfiles = {}
var translatedfiles = {}

pathregex = /\/?([^\/]+)\/(.+)/

function sum_up(counter)
{
  var result = 0
  if (typeof counter == "number")
  {
    return counter
  }
  for (f in counter)
  {
    result += sum_up(counter[f])
  }
  return result
}

function access_by_path(obj, path, newval)
{
  //console.log(path)
  //console.log(obj)
  if (path.length == 0)
  {
    return obj
  }
  var ans = path.match(pathregex)
  if (ans == null)
  {
    if (typeof newval == "number")
    {
      obj[path] = newval
    }
    return obj[path]
  }
  var cur = ans[1]
  var tail = ans[2]
  return get_by_path(obj[cur], tail, newval)
}

function get_by_path(obj, path)
{return access_by_path(obj, path)}

function set_translated(obj, path, n)
{
  path = path.substring("translations/".length)
  oldvalue = access_by_path(obj, path)
  if (oldvalue != n)
  {
    access_by_path(obj, path, n)
    postMessage({name: "updatetranslated", json: obj})
  }
}

function handle_status(data)
{
  var path = data.path.substring("translations/".length)
  var trs = sum_up(get_by_path(translatedfiles, path))
  var value = trs * 100 / sum_up(get_by_path(totalfiles, path))
  postMessage({name: "setstatus", id: data.id, val: value})
}

onmessage = function(msg)
{
  switch (msg.data.name)
  {
    case "totalupdate":
      totalfiles = msg.data.json
      break;
    case "translatedupdate":
      translatedfiles = msg.data.json
      break;
    case "getstatus":
      handle_status( msg.data)
      break;
    case "settranslated":
      set_translated(translatedfiles, msg.data.path, msg.data.value)
      break;
    default:
      break;
  }
}
