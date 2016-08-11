
const api_prefix = "https://api.github.com/"

function setAuthData(xhr, authdata)
{
  if (authdata.uname && authdata.upass)
  {
    xhr.setRequestHeader ("Authorization", "Basic " +
      btoa(authdata.uname + ":" + authdata.upass));
  }
}

function GHAccount(authdata, repo)
{
  this.authdata = authdata
  this.targetrepo = repo
  this.remotehead = ""
  this.localhead = ""
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

GHAccount.prototype.getJSON = function (url, data, callback)
{
  if (typeof callback == 'undefined')
  {
    callback = data
    data = {}
  }
  var authdata = this.authdata
  $.ajax({
    dataType: "json",
    beforeSend: function(xhr) {setAuthData(xhr,authdata)},
    url: api_prefix + url,
    data: data,
    success: callback
  });
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
  this.getJSON(this.get_repo_suffix() + "branches/web-interface",
    function(branch_json)
    {
      var commit_sha = branch_json.commit.sha
      if (commit_sha == acc.remotehead)
      {
        commit_sha = acc.localhead
      }
      acc.remotehead = commit_sha
      // Hopefully remotehead will updated to local at next commit
      var new_tree = {
        base_tree: branch_json.commit.commit.tree.sha,
        tree: filetree
      }
      on_progress(25)
      $.ajax({
        url: prefix + "git/trees",
        type: "POST",
        beforeSend: function(xhr) {setAuthData(xhr,authdata)},
        data: JSON.stringify(new_tree),
        contentType: 'application/json',
        error: on_fail,
        success: function(tree_json)
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
          on_progress(50)
          $.ajax({
            url: prefix + "git/commits",
            type: "POST",
            contentType: 'application/json',
            beforeSend: function(xhr) {setAuthData(xhr,authdata)},
            data: JSON.stringify(commit_body),
            error: on_fail,
            success: function(commit_json)
            {
              on_progress(75)
              $.ajax({
                type: "PATCH",
                url: prefix + "git/refs/heads/web-interface",
                contentType: 'application/json',
                beforeSend: function(xhr) {setAuthData(xhr,authdata)},
                data: JSON.stringify({sha:commit_json.sha}),
                success: function(q)
                {
                  on_progress(100);
                  acc.localhead = q.object.sha
                  on_success(q)
                },
                error: on_fail
              })
            
            }
          })
        }
      })
    })
}
