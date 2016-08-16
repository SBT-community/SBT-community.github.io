
const api_prefix = "https://api.github.com/"

function setAuthData(xhr, authdata)
{
  if (authdata.uname && authdata.upass)
  {
    xhr.setRequestHeader ("Authorization", "Basic " +
      btoa(authdata.uname + ":" + authdata.upass));
  }
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
  $.ajax({
    url: api_prefix + "user",
    type: 'GET',
    beforeSend: function(xhr) {setAuthData(xhr,authdata)},
    data: {},
    success: function(a)
    {
      acc.authdata = authdata
      on_success(a)
    },
    error: on_fail
  })
}

GHAccount.prototype.get_repo_suffix = function()
{
  return "repos/" + this.targetrepo + '/'
}

GHAccount.prototype.getJSON = function (url, data)
{
  var authdata = this.authdata
  return new Promise(function(ok, fail){
    $.ajax({
      dataType: "json",
      beforeSend: function(xhr) {setAuthData(xhr,authdata)},
      url: api_prefix + url,
      data: data,
      success: ok,
      error: fail
    });
  })
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
  var prefix = api_prefix + "repos/" + this.repo
  var request = {
    content: string_content,
    encoding: "utf-8"
  }
  return new Promise(function(ok, fail){
    $.ajax({
      url: prefix + "/git/blobs",
      type: "POST",
      beforeSend: function(xhr) {setAuthData(xhr,authdata)},
      data: JSON.stringify(request),
      contentType: 'application/json',
      success: ok,
      error: fail
    })
  })
}

GHAccount.prototype.do_commit = function (msg, filetree, on_fail,
  on_success, on_progress)
{
  var prefix = api_prefix + this.get_repo_suffix()
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
      return new Promise( function(ok, fail){
        $.ajax({
          url: prefix + "git/trees",
          type: "POST",
          beforeSend: function(xhr) {setAuthData(xhr,authdata)},
          data: JSON.stringify(new_tree),
          contentType: 'application/json',
          error: fail,
          success: ok
        })
      })
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
      return new Promise(function(ok, fail){
        $.ajax({
          url: prefix + "git/commits",
          type: "POST",
          contentType: 'application/json',
          beforeSend: function(xhr) {setAuthData(xhr,authdata)},
          data: JSON.stringify(commit_body),
          error: fail,
          success: ok
        })
      })
    })
  var updated_head_promise = Promise.resolve(new_commit_promise).then(
    function(commit_json)
    {
      on_progress(80)
      return new Promise(function(ok, fail)
      {
        $.ajax({
          type: "PATCH",
          url: prefix + "git/refs/heads/" + acc.branch,
          contentType: 'application/json',
          beforeSend: function(xhr) {setAuthData(xhr,authdata)},
          data: JSON.stringify({sha:commit_json.sha}),
          success: ok,
          error: fail
        })
      })
    })
  updated_head_promise.catch(on_fail)
  updated_head_promise.then(function(upd_head)
  {
    on_progress(100);
    on_success(upd_head)
  })
}
