"use strict";

const editors_per_page = 25
const schema = {
  schema : {
    options: {
        collapsed: true,
    },
    type: "object",
    format: "table",
    properties: {
      "Comment":{
        type: "string",
        title: "Комментарий"
      },
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
    }
  }
}

function check_codex_length(text, after_check)
{
  let maxwidth = 40
  let width = maxwidth
  let height = 17 - 1 // first string taken anyway
  let splited = text.split(/([^\t\s\n\r]+|\r?\n)/)
  for (let s in splited)
  {
    if (splited[s].length == 0 || splited[s].match(/\^.+;/))
      continue
    else if(splited[s] == '\n')
    {
      height--
      width = maxwidth
    }
    else
      width -= splited[s].length
    if (width < 0 && splited[s] != ' ')
    {
      width = maxwidth - splited[s].length
      height--
    }
  }
  after_check(-height)
}

function theEditor(holder, navigator)
{
  this.holder = holder
  this.navbar = navigator
  this.filedata = {}
  this.json = {}
  this.subeditors = {}
  this.touched = false
}


theEditor.prototype.load_part = function (start)
{
  this.subeditors = {}
  this.holder.html("")
  var ed = this
  var to_highlight = []
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
    var subeditor = new JSONEditor(this.holder[0], fixed_schema)
    subeditor.setValue(this.json[i])
    this.subeditors[i] = subeditor
    if (this.json[i]['DeniedAlternatives'] &&
      this.json[i]['DeniedAlternatives'].length > 0)
    {
      $(subeditor.root_container)
        .find('div[data-schemapath="root.DeniedAlternatives"]')
        .addClass('alert-success')
    }
    function generate_codex_checker(ii)
    {
      function after_check(diff)
      {
        $(ed.subeditors[ii].getEditor('root.Texts.Rus').container)
          .find('#overflow-warning').remove()
        $(ed.subeditors[ii].root_container).find('#overflow-head').remove()
        if (diff > 0)
        {
          $(ed.subeditors[ii].root_container).addClass('alert-danger')
          $(ed.subeditors[ii].getEditor('root.Texts.Rus').container)
            .append('<p id="overflow-warning">Текст длиннее окна кодекса!' +
            ' Лишних строк: '+ diff +'!</p>')
          $(ed.subeditors[ii].root_container).children('h3')
          .append('<span id="overflow-head">Слишком длинный текст!</span>')
        }
        else
        {
          $(ed.subeditors[ii].root_container).removeClass('alert-danger')
        }
      }
      return function(first)
      {
        let curval = ed.subeditors[ii].getEditor('root.Texts.Rus').getValue()
        check_codex_length(curval, after_check)
        ed.touched = true
        if (first){ ed.touched = false}
      }
    }
    let ccheck = generate_codex_checker(i)
    ccheck(true)
    subeditor.watch('root.Texts.Rus', ccheck)
    if (this.json[i]['Texts']['Rus'] === "")
    {
      subeditor.root_container.className += ' alert-info'
    }
  }
  $(this.holder).find("[name$=\"[Eng]\"]").each(function(i,d){d.readOnly=true})
  $(this.holder).find("[name$=\"[Comment]\"]").each(function(i,d){d.readOnly=true})
  $(this.holder).find("textarea[name$=\"]\"]").each(function(i,d){
      d.className = 'input-lg form-control'
      if (d.value.length != 0)
      {
        d.rows = Math.ceil(d.value.length/27)
      }
    })
  $(this.holder).find('div[data-schemapath^="root.Files."]').each(function(i,c){
      let prefix_len = "root.Files.".length
      let path = $(c).attr('data-schemapath').substring(prefix_len)
      let pathhref = path.split('/').pop().split('.')[0]
      $(c).find('button').hide()
      $(c).find('[data-schemapath^="root.Files.' + path + '."]').each(function(i,p)
      {
        let internal_path = $(p).find('input')[0].value
        $(p).parent().append('<p>' + internal_path + '</p>')
        $(p).hide()
      })
      $(c).find('h3').replaceWith("<a href='http://starbounder.org/Data:" +
        pathhref + "' target='_blank'>" + path + "</a>")
    })
  $('table.table-bordered').css('width', '')
}

theEditor.prototype.get_json = function ()
{
  var thejson = this.json
  $.each(this.subeditors, function(i, s)
  {
    thejson[i] = s.getValue()
  })
  return thejson
}

theEditor.prototype.json_onload = function (data)
{
  this.json = []
  this.navbar.innerHTML = ""
  var page = 1
  $('#current-filename').text(this.filedata.name)
  var editor = this
  function get_onclick(start)
  {
    return (function(){
      $.each(editor.subeditors, function(n, e){
        editor.json[n] = e.getValue()
        e.destroy()
      })
      $(editor.navbar).children().removeClass('active')
      $(editor.navbar).find('#navbarel-' + start).addClass('active')
      editor.load_part(start)
    })
  }

  for (let i = 0 ; i < data.length; i += editors_per_page)
  {
    var navelement = document.createElement('li')
    navelement.id = 'navbarel-' + i
    var navbutton = document.createElement('a')
    navbutton.innerHTML = page
    navbutton.title = page
    navbutton.onclick = get_onclick(i)
    navelement.appendChild(navbutton)
    this.navbar.append(navelement)
    this.json = this.json.concat(data.slice(i, i+editors_per_page))
    page += 1
  }
  $('#navbarel-0').addClass('active')
  this.load_part(0)
}


theEditor.prototype.reset = function ()
{
  this.navbar.html("")
  this.holder.html("")
  $('#current-filename').text('')
  $.each(this.subeditors, function(n, e){
      e.destroy()
    })
  this.subeditors = {}
  this.json = {}
  this.filedata = {}
}

theEditor.prototype.open_json = function (content)
{
  let data = $.parseJSON(content)
  this.json_onload(data)
}
