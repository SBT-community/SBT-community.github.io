
var totalfiles = {}
var translatedfiles = {}
var loaded = {total: false, tr: false}

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

function get_by_path(obj, path)
{
  if (path.length == 0)
  {
    return obj
  }
  var ans = path.match(pathregex)
  if (ans == null)
  {
    return obj[path]
  }
  var cur = ans[1]
  var tail = ans[2]
  return get_by_path(obj[cur], tail)
}

function waitfor(test, action, param)
{
  if (! test())
  {
    setTimeout(function(){waitfor(test, action,param)}, 100)
  }
  else
  {
    action(param)
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
      loaded.total = true
      break;
    case "translatedupdate":
      translatedfiles = msg.data.json
      loaded.tr = true
      break;
    case "getstatus":
      waitfor(function(){return (loaded.total && loaded.tr)},
        handle_status, msg.data)
      break;
    default:
      break;
  }
}
