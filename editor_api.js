
const realholderid = 'real-holder-for-editors'
const navbarid = 'editor-navigator'
const editors_per_page = 25
const schema = {
  schema : {
    options: {
        collapsed: true,
    },
    type: "object",
    format: "table",
    properties: {
      "JSON_path":{
        type: "string",
        format: "url",
        title: "Тип текстовой метки"
      },
      "Texts":{
        title: "Тексты",
        options:{
          disable_collapse: true,
          required: true
        },
        type: "object",
        properties: {
          "Eng":{
            type: "string",
            title: "Английский текст",
            format: "textarea",
          },
          "Rus": {
            type: "string",
            title: "Русский текст",
            format: "textarea",
            options:{
              required: true
            },
          }
        },
        default_properties: ["Rus", "Eng"]
      },//Texts
      "DeniedAlternatives":{
        type: "array",
        format: "table",
        title: "Отброшенные варианты перевода",
        options:{
          disable_array_add: false,
          disable_array_delete: false,
          collapsed: true
        },
        items: {
          title: "Вариант",
          format: "text",
          type: "string",
        }
      },
      "Files":{
        type: "array",
        title: "Используется в:",
        format: "table",
        options:{
          collapsed: true,
          disable_array_add: true,
          disable_array_delete: true,
        },
        items:{
          type: "string",
          title: "Ссылки на starbound wiki:",
          format: "week",
          links:[
            {
              rel: "Data",
              class: "wikilink",
              href: "{{self}}"
            }
          ]
        }
      },
    }
  }
}

function make_editor(holder)
{
  var realholder = document.createElement('div')
  realholder.id = realholderid
  var navigator = document.createElement('div')
  navigator.id = navbarid
  navigator.style.position = "relative"
  let to_top = navigator.style.top
  console.log(to_top)
  document.addEventListener('scroll', function()
    {
      if (document.body.scrollTop > 100)
      {
        navigator.style.top = 0
        navigator.style.position = "fixed"
        navigator.style["z-index"] = 10
      }
      else
      {
        navigator.style.position = "relative"
      }
    })
  holder.appendChild(navigator)
  holder.appendChild(realholder)

  return {filedata: {}, json: {}, subeditors: {}}
}


function load_part(editor, start)
{
  editor.subeditors = {}
  var holder = document.getElementById(realholderid)
  holder.innerHTML = ""
  for (var i=start;i<editor.json.length && i<start+editors_per_page;i+=1)
  {
    var fixed_schema = schema
    var titletext = editor.json[i]['Texts']['Eng']
    if (titletext.length > 16)
    {
      titletext = titletext.slice(0, 16) + "..."
    }
    fixed_schema.schema.title = titletext
    var subeditor = new JSONEditor(holder, fixed_schema)
    subeditor.setValue(editor.json[i])
    editor.subeditors[i] = subeditor
  }
  $.each($("#"+ realholderid + " input[type=url]"), function(i,d){d.disabled=true})
  $.each($("#"+ realholderid + " [name$=\"[Eng]\"]"), function(i,d){d.disabled=true})
  $.each($("#"+ realholderid + " textarea[name$=\"]\"]"),
    function(i,d){
      if (d.scrollHeight < 300)
      {
        d.style.height=d.scrollHeight
      }
      else
      {
        d.style.height=300
      }
    })
  
  $.each($("#"+ realholderid + " input[type=week]"),
    function(i,c){
      var d = c.parentNode
      var o = d.parentNode
      d.style.visibility="hidden";
      d.style.height="0px";
      d.disabled=true
      $.each(o.getElementsByClassName("wikilink"),
        function(a, t){
          var link = t.href
          var dataname = link.split("/").pop().split(".")[0]
          t.href = "http://starbounder.org/Data:" + dataname
          t.text = link.slice(link.indexOf("assets"))
        })
    })
}


function json_onload(editor, data)
{
  editor.json = []
  //console.log(editor.json)
  //var page = 1
  var navbar = document.getElementById(navbarid)
  navbar.innerHTML = ""
  var page = 1

  function get_onclick(start)
  {
    return (function(){
      $.each(editor.subeditors, function(n, e){
        editor.json[n] = e.getValue()
        e.destroy()
      })
      load_part(editor, start)
    })
  }

  for (i = 0 ; i < data.length; i += editors_per_page)
  {
    var navbutton = document.createElement('button')
    navbutton.className = "btn btn-default"
    navbutton.innerHTML = page
    navbutton.title = page
    navbutton.onclick = get_onclick(i)
    navbar.appendChild(navbutton)
    editor.json = editor.json.concat(data.slice(i, i+editors_per_page))
    page += 1
  }

  load_part(editor, 0)
}


function reset(editor)
{
  document.getElementById(navbarid).innerHTML = ""
  document.getElementById(realholderid).innerHTML = ""
  $.each(editor.subeditors, function(n, e){
      e.destroy()
    })
  editor.subeditors = {}
  editor.json = {}
  editor.filedata = {}
}

function load_json(editor,url)
{
  $.getJSON(url, function(data){
    json_onload(editor, data)
  })

}
