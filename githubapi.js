
function setAuthData(xhr, authdata)
{
  if (authdata.uname && authdata.upass)
  {
    xhr.setRequestHeader ("Authorization", "Basic " +
      btoa(authdata.uname + ":" + authdata.upass));
  }
}

function check_authdata(authdata, on_success, on_fail)
{
  $.ajax({
    url: "https://api.github.com/user",
    type: 'GET',
    beforeSend: function(xhr) {setAuthData(xhr,authdata)},
    data: {},
    success: on_success,
    error: on_fail
  })
}

function getJSON(authdata, url, data, callback)
{
  if (typeof callback == 'undefined')
  {
    callback = data
    data = {}
  }
  $.ajax({
    dataType: "json",
    beforeSend: function(xhr) {setAuthData(xhr,authdata)},
    url: url,
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

function make_tree_blob(string_content)
{
   var prefix = "https://api.github.com/repos/SBT-community/Starbound_RU"
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

function do_commit(authdata, msg, filetree, on_fail, on_success, on_progress)
{
  var prefix = "https://api.github.com/repos/SBT-community/Starbound_RU"
  getJSON(authdata,
    prefix + "/branches/web-interface",
    function(branch_json)
    {
      var commit_sha = branch_json.commit.sha
      var new_tree = {
        base_tree: branch_json.commit.commit.tree.sha,
        tree: filetree
      }
      on_progress(25)
      $.ajax({
        url: prefix + "/git/trees",
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
            url: prefix + "/git/commits",
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
                url: prefix + "/git/refs/heads/web-interface",
                contentType: 'application/json',
                beforeSend: function(xhr) {setAuthData(xhr,authdata)},
                data: JSON.stringify({sha:commit_json.sha}),
                success: function(q){on_progress(100); on_success(q)},
                error: on_fail
              })
            
            }
          })
        }
      })
    })
}
