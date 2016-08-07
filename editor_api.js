
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
        type: "object",
        title: "Используется в:",
        format: "table",
        options:{
          collapsed: true,
          disable_array_add: true,
          disable_array_delete: true,
        },
        patternProperties:{
          "^.+$":{
            type: "array",
            format: "table",
            options:{
              collapsed: true,
              disable_array_add: true,
              disable_array_delete: true,
            },
            items:{
              options:{
                collapsed: true,
                disable_array_add: true,
                disable_array_delete: true,
              },
              type: "string",
              title: "Путь внутри json",
              format: "url"
            }
          }
        }
      },
    }
  }
}

function make_editor(holder)
{
  var realholder = document.createElement('div')
  realholder.id = realholderid
  var navigator = document.createElement('ul')
  navigator.id = navbarid
  navigator.className = 'pagination'
  navigator.style["z-index"] = 10
  holder.appendChild(navigator)
  holder.appendChild(realholder)
  let totop = $('#' + navbarid).offset().top
  document.addEventListener('scroll', function()
    {
      if ($(window).scrollTop() > totop)
      {
        navigator.style.top = 0
        navigator.style.position = "fixed"
      }
      else
      {
        navigator.style.position = "relative"
      }
    })
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
    if (! ('Rus' in editor.json[i]['Texts']))
    {
      editor.json[i]['Texts']['Rus'] = ""
    }
    if (titletext.length > 16)
    {
      titletext = titletext.slice(0, 16) + "..."
    }
    if (editor.json.length-start < 2)
    {
      fixed_schema.schema.options.collapsed = false
    }
    fixed_schema.schema.title = titletext
    var subeditor = new JSONEditor(holder, fixed_schema)
    subeditor.setValue(editor.json[i])
    editor.subeditors[i] = subeditor
  }
  $.each($("#"+ realholderid + " input[type=url]"), function(i,d)
    {d.style.width = '500px'; d.readOnly=true})
  $.each($("#"+ realholderid + " [name$=\"[Eng]\"]"), function(i,d){d.readOnly=true})
  $.each($("#"+ realholderid + " textarea[name$=\"]\"]"),
    function(i,d){
      d.className = 'input-lg form-control'
      if (d.value.length != 0)
      {
        d.rows = Math.ceil(d.value.length/27)
      }
    })
  $.each($("#"+ realholderid + ' div[data-schemapath^="root.Files."]'),
    function(i,c){
      console.log("Found")
      console.log(c)
      var path = c.getAttribute('data-schemapath').substring("root.Files.".length)
      pathhref = path.split('/').pop().split('.')[0]
      $.each( c.getElementsByTagName('button'), function(a,t)
        {
          t.style.display = 'none'
        })
      $.each(c.getElementsByTagName('h3'),
        function(a, t){
          t.innerHTML = "<a href='http://starbounder.org/Data:" + pathhref +
            "' target='_blank'>" + path + "</a>"
        })
    })
}

function get_json(editor)
{
  $.each(editor.subeditors, function(i, s)
  {
    editor.json[i] = s.getValue()
  })
  return editor.json
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
      $.each(document.getElementById(navbarid).childNodes, function(i, c){
        c.className = ""
      }) 
      document.getElementById('navbarel-' + start).className = 'active'
      load_part(editor, start)
    })
  }

  for (i = 0 ; i < data.length; i += editors_per_page)
  {
    var navelement = document.createElement('li')
    navelement.id = 'navbarel-' + i
    var navbutton = document.createElement('a')
    navbutton.innerHTML = page
    navbutton.title = page
    navbutton.onclick = get_onclick(i)
    navelement.appendChild(navbutton)
    navbar.appendChild(navelement)
    editor.json = editor.json.concat(data.slice(i, i+editors_per_page))
    page += 1
  }
  document.getElementById('navbarel-0').className = 'active'
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

function open_json(editor, content)
{
  data = $.parseJSON(content)
  json_onload(editor, data)
}

function load_json(editor,url)
{
  $.getJSON(url, function(data){
    json_onload(editor, data)
  })
}
