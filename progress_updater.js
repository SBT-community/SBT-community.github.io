
var totalfiles = {}
var translatedfiles = {}

pathregex = /\/?([^\/]+)\/(.+)/

function sumUp(counter)
{
  var result = 0
  if (typeof counter == "number")
  {
    return counter
  }
  for (f in counter)
  {
    result += sumUp(counter[f])
  }
  return result
}

function accessByPath(obj, path, newval)
{
  //console.log(path)
  //console.log(obj)
  if (path.length == 0)
  {
    return obj
  }
  var ans = path.match(pathregex)
  if (!Array.isArray(ans))
  {
    if (typeof newval == "number")
    {
      obj[path] = newval
    }
    return obj[path]
  }
  var cur = ans[1]
  var tail = ans[2]
  return accessByPath(obj[cur], tail, newval)
}

function getByPath(obj, path)
{return accessByPath(obj, path)}

function setTranslated(obj, path, n)
{
  path = path.substring("translations/".length)
  oldvalue = access_by_path(obj, path)
  if (oldvalue !== n)
  {
    access_by_path(obj, path, n)
    postMessage({name: "updatetranslated", needed: true, json: obj})
  }
  else
  {
    postMessage({name: "updatetranslated", needed: false})
  }
}

function handleStatus(data)
{
  var path = data.path.substring("translations/".length)
  var trs = sumUp(getByPath(translatedfiles, path))
  var value = trs * 100 / sumUp(getByPath(totalfiles, path))
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
      handleStatus( msg.data)
      break;
    case "updatetranslated":
      setTranslated(translatedfiles, msg.data.path, msg.data.value)
      break;
    default:
      break;
  }
}
