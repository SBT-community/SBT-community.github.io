

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

function theEditor(holder, navigator)
{
  this.holderid = holder
  this.navbarid = navigator
  this.filedata = {}
  this.json = {}
  this.subeditors = {}
}


theEditor.prototype.load_part = function (start)
{
  this.subeditors = {}
  var holder = document.getElementById(this.holderid)
  holder.innerHTML = ""
  for (var i=start;i<this.json.length && i<start+editors_per_page;i+=1)
  {
    var fixed_schema = schema
    var titletext = this.json[i]['Texts']['Eng']
    if (! ('Rus' in this.json[i]['Texts']))
    {
      this.json[i]['Texts']['Rus'] = ""
    }
    if (titletext.length > 16)
    {
      titletext = titletext.slice(0, 16) + "..."
    }
    if (this.json.length-start < 2)
    {
      fixed_schema.schema.options.collapsed = false
    }
    fixed_schema.schema.title = titletext
    var subeditor = new JSONEditor(holder, fixed_schema)
    subeditor.setValue(this.json[i])
    this.subeditors[i] = subeditor
  }
  $.each($("#"+ this.holderid + " input[type=url]"), function(i,d)
    {d.style.width = '500px'; d.readOnly=true})
  $.each($("#"+ this.holderid + " [name$=\"[Eng]\"]"), function(i,d){d.readOnly=true})
  $.each($("#"+ this.holderid + " textarea[name$=\"]\"]"),
    function(i,d){
      d.className = 'input-lg form-control'
      if (d.value.length != 0)
      {
        d.rows = Math.ceil(d.value.length/27)
      }
    })
  $.each($("#"+ this.holderid + ' div[data-schemapath^="root.Files."]'),
    function(i,c){
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

theEditor.prototype.get_json = function ()
{
  $.each(this.subeditors, function(i, s)
  {
    this.json[i] = s.getValue()
  })
  return this.json
}

theEditor.prototype.json_onload = function (data)
{
  this.json = []
  var navbar = document.getElementById(this.navbarid)
  navbar.innerHTML = ""
  var page = 1

  function get_onclick(start)
  {
    return (function(){
      $.each(this.subeditors, function(n, e){
        this.json[n] = e.getValue()
        e.destroy()
      })
      $.each(document.getElementById(this.navbarid).childNodes, function(i, c){
        c.className = ""
      }) 
      document.getElementById('navbarel-' + start).className = 'active'
      this.load_part(start)
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
    this.json = this.json.concat(data.slice(i, i+editors_per_page))
    page += 1
  }
  document.getElementById('navbarel-0').className = 'active'
  this.load_part(0)
}


theEditor.prototype.reset = function ()
{
  document.getElementById(this.navbarid).innerHTML = ""
  document.getElementById(this.holderid).innerHTML = ""
  $.each(this.subeditors, function(n, e){
      e.destroy()
    })
  this.subeditors = {}
  this.json = {}
  this.filedata = {}
}

theEditor.prototype.open_json = function (content)
{
  data = $.parseJSON(content)
  this.json_onload(data)
}

theEditor.prototype.load_json = function (url)
{
  getJSON(authdata, url, function(data){
    this.json_onload(data)
  })
}
