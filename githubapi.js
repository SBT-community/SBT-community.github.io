
const api_prefix = "https://api.github.com/"

function setAuthData(xhr, authdata)
{
  if (authdata.uname && authdata.upass)
  {
    xhr.setRequestHeader ("Authorization", "Basic " +
      btoa(authdata.uname + ":" + authdata.upass));
  }
}

function request(url, type, data, authdata)
{
  result = new Promise( function(ok, fail)
  {
    let ajax = new XMLHttpRequest()
    ajax.open(type, api_prefix + url, true)
    ajax.onerror = fail
    ajax.onload = function () {
      if (ajax.status >= 400)
        fail(ajax.getAllResponseHeaders(), ajax.statusText, ajax.response)
      else
        ok(ajax.response);
    };
    setAuthData(ajax, authdata)
    ajax.send(data);
  })
  return result.then(function(answer){return JSON.parse(answer)})
}

function GHAccount(authdata, repo, branch)
{
  this.authdata = authdata
  this.targetrepo = repo
  this.branch = branch
}

GHAccount.prototype.check_authdata = function (authdata, on_success, on_fail)
{
  var acc = this
  let authed = request("user", "GET", {}, authdata)
  authed.then(function(a)
    {
      acc.authdata = authdata
      on_success(a)
    }).catch(on_fail)
}

GHAccount.prototype.get_repo_suffix = function()
{
  return "repos/" + this.targetrepo + '/'
}

GHAccount.prototype.getJSON = function (url, data)
{
  return request(url, "GET", data, this.authdata)
}

function make_tree_entry(path, string_content)
{
  return {
    path: path,
    mode: "100644",
    content: string_content,
    type: "blob"
  }
}

GHAccount.prototype.make_tree_blob = function (string_content)
{
  let prefix = "repos/" + this.repo
  let req = {
    content: string_content,
    encoding: "utf-8"
  }
  return request(prefix + "/git/blobs", "POST", JSON.stringify(req), this.authdata)
}

GHAccount.prototype.do_commit = function (msg, filetree, on_progress)
{
  let authdata = this.authdata
  var acc = this
  var commit_sha = ""
  var head_json_promise = this.getJSON(this.get_repo_suffix() + "git/refs/heads/" +
    this.branch)
  var commit_json_promise = head_json_promise.then(function(ref_json)
    {
      commit_sha = ref_json.object.sha
      on_progress(20)
      return acc.getJSON( acc.get_repo_suffix() + "git/commits/" + commit_sha)
    })
  var new_tree_promise = Promise.resolve(commit_json_promise)
    .then(function(com_json)
    {
      var new_tree = {
        base_tree: com_json.tree.sha,
        tree: filetree
      }
      on_progress(40)
      return request(acc.get_repo_suffix() + "git/trees", "POST",
        JSON.stringify(new_tree), authdata)
    })
  var new_commit_promise = Promise.resolve(new_tree_promise).then(
    function(tree_json)
    {
      var commit_body = {
        message: msg,
        tree: tree_json.sha,
        parents: [commit_sha]
      }
      if (authdata.email)
      {
        commit_body.author = {name: authdata.uname, email: authdata.email}
        commit_body.commiter = {name: authdata.uname, email: authdata.email}
      }
      on_progress(60)
      return request(acc.get_repo_suffix() + "git/commits", "POST",
        JSON.stringify(commit_body), authdata)
    })
  var updated_head_promise = Promise.resolve(new_commit_promise).then(
    function(commit_json)
    {
      on_progress(80)
      return request(acc.get_repo_suffix() + "git/refs/heads/" + acc.branch, "PATCH",
        JSON.stringify({sha:commit_json.sha}), authdata)
    })
  return updated_head_promise.then(function(upd_head)
  {
    on_progress(100);
    return upd_head
  })
}
