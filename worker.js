importScripts("githubapi.js", "https://rawgit.com/dankogai/js-base64/master/base64.min.js")

var totalfiles = {}
var translatedfiles = {}
var substitutions = {}

pathregex = /\/?([^\/]+)\/(.+)/

function sumUp(counter)
{
  let result = 0
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

function loadSubstitutions(force)
{
  if (Object.keys(substitutions).length !== 0 && ! force)
    return Promise.resolve(substitutions)
  let result = new Promise(function(ok, fail){
    let ajax = new XMLHttpRequest()
    ajax.open("GET", 'https://rawgit.com/SBT-community/Starbound_RU/web-interface/'+
        'translations/substitutions.json', true)
    ajax.onerror = fail
    ajax.onload = function () {
      if (ajax.status >= 400)
        fail(ajax.getAllResponseHeaders(), ajax.statusText, ajax.response)
      else
        ok(ajax.response);
    };
    ajax.send();
  })
  return result.then(function(answer)
  {
    substitutions = JSON.parse(answer);
    return substitutions
  })
}

function findPath(data, acc)
{
  let promised_substitutions = loadSubstitutions()
  let results = []
  promised_substitutions.then(function(subs)
  {
    for(k in subs)
      if(k.indexOf(data.pattern) != -1)
        for (i in subs[k])
          if (!results.includes(subs[k][i]))
          {
            results.push(subs[k][i])
            postMessage({name:"foundresult", msg: subs[k][i]})
          }
  }).catch(function(e){
    console.log(e)
  })
}

function refreshProgress(data, account)
{
  let thedate = new Date()
  let prefix = account.get_repo_suffix() + "contents/translations/"
  let postfix = "?ref="+account.branch+"&current_time=" + thedate.getTime()
  let totprom = account.getJSON(prefix + "totallabels.json"+postfix).then(
    function(prp_json){
      totalfiles = JSON.parse(Base64.decode(prp_json.content))
    })
  let trprom = account.getJSON(prefix + "translatedlabels.json"+postfix).then(
    function(prp_json){
      translatedfiles = JSON.parse(Base64.decode(prp_json.content))
    })
  return Promise.all([totprom, trprom])
}

handlers = {
  "getstatus": handleStatus,
  "searchfilename": findPath,
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
