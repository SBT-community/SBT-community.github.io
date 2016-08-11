
function get_translation_status(msgHandlerList, account, preworker)
{
  var thedate = new Date()
  var result = new Promise(function (ok, fail)
  {
    preworker.onmessage = function(msg)
    {
      for (h in msgHandlerList)
      {
        if (msgHandlerList[h](msg)) {break}
      }
    }
    prefix = "repos/SBT-community/Starbound_RU/contents"+
      "/translations/"
    postfix = "?ref=web-interface&current_time=" + thedate.getTime()
    totprom = new Promise(function (got, oops)
    {
      account.getJSON(prefix + "totallabels.json"+postfix,
      function(prp_json){
        var json = $.parseJSON(Base64.decode(prp_json.content))
        preworker.postMessage({name: "totalupdate", json: json})
        got()
      })
    })
    trprom = new Promise(function (got, oops)
    {
      account.getJSON(prefix + "translatedlabels.json"+postfix,
      function(prp_json){
        var json = $.parseJSON(Base64.decode(prp_json.content))
        preworker.postMessage({name: "translatedupdate", json: json})
        got()
      })
    })
    Promise.all([totprom, trprom]).then(function()
    {
      ok(preworker)
    })
  })
  return result
}

function refresh_worker(w)
{
  w.promise = get_translation_status(w.handlers, w.account,
    w.worker)
}

function get_worker(account, initialHandlers)
{
  var theworker = {}
  theworker.worker = new Worker('progress_updater.js')
  theworker.account = account
  theworker.handlers = []
  if (Array.isArray(initialHandlers))
    {theworker.handlers = theworker.handlers.concat(initialHandlers)}
  refresh_worker(theworker)
  setPeriodic(true, theworker)
  return theworker
}

function add_event_callback(w, ename, callback)
{
  var index = w.handlers.length
  w.handlers.push(function(msg)
  {
    switch(msg.data.name)
    {
      case ename:
        return callback(msg.data)
      default:
        return false
    }
  })
  return index
}

function remove_event_callback(w, index)
{w.handlers.splice(index, 1)}

function setPeriodic(firsttime, w)
{
  setTimeout(function()
  {
    setPeriodic(false, w)
  }, 5 * 60000)
  if (firsttime)
  {return}
  refresh_worker(w)
}

