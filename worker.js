importScripts("githubapi.js", "https://rawgit.com/dankogai/js-base64/master/base64.min.js")

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
  if (path.length == 0)
  {
    return obj
  }
  let ans = path.match(pathregex)
  if (!Array.isArray(ans))
  {
    if (typeof newval == "number")
    {
      obj[path] = newval
    }
    return obj[path]
  }
  let cur = ans[1]
  let tail = ans[2]
  return accessByPath(obj[cur], tail, newval)
}

function getByPath(obj, path)
{return accessByPath(obj, path)}

function setTranslated(msg)
{
  let path = msg.path.substring("translations/".length)
  oldvalue = accessByPath(translatedfiles, path)
  if (oldvalue !== msg.value)
  {
    console.log(accessByPath(translatedfiles, path, msg.value))
    return {needed: true, json: translatedfiles}
  }
  else
    return {needed: false}
}

function handleStatus(data)
{
  let path = data.path.substring("translations/".length)
  let trs = sumUp(getByPath(translatedfiles, path))
  let value = trs * 100 / sumUp(getByPath(totalfiles, path))
  return {id: data.id, val: value}
}

function findPath(data)
{
  
}

function refreshProgress(data, account)
{
  let thedate = new Date()
  let prefix = account.get_repo_suffix() + "contents/translations/"
  let postfix = "?ref="+account.branch+"&current_time=" + thedate.getTime()
  var totprom = account.getJSON(prefix + "totallabels.json"+postfix).then(
    function(prp_json){
      totalfiles = JSON.parse(Base64.decode(prp_json.content))
    })
  var trprom = account.getJSON(prefix + "translatedlabels.json"+postfix).then(
    function(prp_json){
      translatedfiles = JSON.parse(Base64.decode(prp_json.content))
    })
  return Promise.all([totprom, trprom])
}

handlers = {
  "getstatus": handleStatus,
  "search": findPath,
  "updatetranslated": setTranslated,
  "refreshprogress": refreshProgress
}

onmessage = function(msg)
{
  if (! handlers[msg.data.name])
    return
  let account = new GHAccount(msg.data.account.authdata, msg.data.account.targetrepo,
    msg.data.account.branch)
  let result = handlers[msg.data.name](msg.data.msg, account)
  Promise.resolve(result).then(function(r)
  {
    postMessage({name: msg.data.name, msg: r})
  }).catch(function(e){console.log(e)})
}
