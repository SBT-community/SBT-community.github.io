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

function check_label_length(text, after_check, maxwidth, maxheight)
{
  let width = maxwidth
  let height = maxheight - 1 // first string taken anyway
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

let onImage = function(imgUrl){
  let image = document.createElement('IMG')
  image.src = imgUrl
  image.className = 'img-rounded img-responsive'
  return image
}

function makeCarousel(name)
{
  let carousel = document.createElement('div')
  carousel.id = "Carousel-" + name
  carousel.className = "carousel slide"
  $(carousel).attr("data-ride", "carousel")
  let left = document.createElement('a')
  let right = document.createElement('a')
  $(left).add(right).addClass("carousel-control")
  $(left).addClass("left")
  $(right).addClass("right")
  left.href = '#Carousel-' + name
  right.href = '#Carousel-' + name
  $(left).attr("data-slide", "prev")
  $(right).attr("data-slide", "next")
  $(left).append("<span class='glyphicon glyphicon-chevron-left'></span>")
  $(right).append("<span class='glyphicon glyphicon-chevron-right'></span>")
  $(carousel).append(left, right)
  return carousel
}

function referenceLookup(subtree, path)
{
  let pageref = path.split('/').pop().split('.')[0]
  let siteUrl = "https://starbounder.org"
  let apiUrl = siteUrl + "/mediawiki/api.php?"
  let to_replace = $(subtree).find('h3')
  let sysAnch = document.createElement("A")
  let container = document.createElement("DIV")
  sysAnch.href = siteUrl + "/Data:" + pageref
  sysAnch.target = "_blank"
  sysAnch.innerHTML = path
  container.appendChild(sysAnch)
  let carousel = makeCarousel(path.replace(/[\/\.]/g, '_'))
  let imageLink = document.createElement('A')
  imageLink.className = 'carousel-inner'
  imageLink.target = "_blank"
  $(carousel).prepend(imageLink)
  to_replace.replaceWith(container)
  let imagesResponse = function(response){
    let icon_needed = true
    let pngneeded = true
    if(response.query.allimages.length > 0)
      container.appendChild(carousel)
    for(let i in response.query.allimages){
      let img = response.query.allimages[i]
      if(icon_needed && img.name.match(/Icon\.png/)){
        $(container).parent().parent().parent().parent().parent()
          .siblings('h3').append("<img class=btn-group src='" + img.url + "'>")
        icon_needed = false
      }
      else if(pngneeded || img.name.match(/Sample/) ||
              ! img.name.match(/png$/)){
        $(imageLink).append("<img class='item center-block img-responsive" +
          " img-rounded' src='"+ img.url + "'>")
        pngneeded = false
      }
    }
    $(imageLink).children().first().addClass("active")
  }
  let serviceResponse = function(response){
    let name = ""
    if(response.error){
      name = pageref.replace(/\s/g, "_")
    }
    else{
      for (let i in response.parse.links){
        let link = response.parse.links[i]
        if(link.ns == 0){
          name = encodeURIComponent(link["*"].replace(/\s/g, '_'))
          break
        }
      }
      if(name == "") return
    }
    imageLink.href = siteUrl + "/" + name
    let wpurl = apiUrl + $.param({
      action:"query",
      format:"json",
      aifrom:name,
      list:"allimages",
      aiprefix:name,
    })
    $.ajax(wpurl, {dataType:"jsonp"}).done(imagesResponse)

  }
  let starbounderUrl = apiUrl + $.param({
      action: "parse",
      format: "json",
      prop: "links",
      page: "Data:" + pageref,
  })
  $.ajax(starbounderUrl,{dataType: "jsonp"})
    .done(serviceResponse)
}

theEditor.prototype.generate_label_checker = function(ii, maxwidth, maxheight)
{
  let ed = this
  function after_check(diff)
  {
    $(ed.subeditors[ii].getEditor('root.Texts.Rus').container)
      .find('#overflow-warning').remove()
    $(ed.subeditors[ii].root_container).find('#overflow-head').remove()
    if (diff > 0)
    {
      $(ed.subeditors[ii].root_container).addClass('alert-danger')
      $(ed.subeditors[ii].getEditor('root.Texts.Rus').container)
        .append('<p id="overflow-warning">Текст длиннее окна!' +
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
    check_label_length(curval, after_check, maxwidth, maxheight)
    ed.touched = true
    if (first){ ed.touched = false}
  }
}


theEditor.prototype.load_part = function (start, selected)
{
  this.subeditors = {}
  var fin = true // if we need to place closing '>' brace

  var endings = []

  // Helps to match the autocompletion sequence regardless of spaces
  let matcher = function (flag, reverse, c) {
    for (var i = reverse.length-1; i>=0; i--) {
      if (reverse[i] == '>' || reverse[i] == ' ') { return }
      else if (reverse[i] == flag) {
        return reverse.substr(i+1)
      }
    }
  }

  let color_autocompletion = {
    at: "^",
    delay: 1,
    displayTpl: "<li class='outlined' style='color:${name};'><b>${name}</b></li>",
    insertTpl: "^${name};",
    callbacks: {
      matcher: matcher
    }
  }

  let tag_autocompletion = {
    at: "<",
    callbacks: {
      filter: function (query, data, key) {
        var result = []
        let query_parts = query.split('.')
        let q_till_dot = query_parts[0]
        let submatch = query_parts.length == 1
        //no dots, using startsWith
        // otherwise the full match is needed
        for (var i = 0; i < data.length; i++) {
          if ((submatch && data[i].name.startsWith(q_till_dot))
              || data[i].name == q_till_dot) {
            result.push({name: data[i].name, desc: data[i].desc})
          }
        }
        fin = false // the second suggestion is possible
        if (result.length == 1) {
          if (result[0].name == q_till_dot) {fin = true}
          // we have a final suggestion, so closing brace anyway
          for (var i = 0;i < endings.length; i++) {
            let with_ending = result[0].name + '.' + endings[i].name
            if (with_ending.startsWith(query)) {
              result.push({name: with_ending, desc: endings[i].desc})
            }
          }
        }
        return result
      },
      matcher: matcher
    },
    displayTpl: "<li>${name} <a style='color: #585858'>${desc}</a></li>",
    insertTpl: "<${name}>",
    limit: 500,
    delay: 1
  }
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
    if (titletext.length > 20)
    {
      titletext = titletext.slice(0, 20) + "..."
    }
    if (this.json.length-start < 3)
    {
      fixed_schema.schema.options.collapsed = false
    }
    fixed_schema.schema.title = titletext
    var subeditor = new JSONEditor(this.holder[0], fixed_schema)
    subeditor.setValue(this.json[i])
    subeditor.root_container.id = 'element-' + i
    if (i === selected)
      $(subeditor.root_container).addClass('alert-warning')
    this.subeditors[i] = subeditor
    if (this.json[i]['DeniedAlternatives'] &&
      this.json[i]['DeniedAlternatives'].length > 0)
    {
      $(subeditor.root_container)
        .find('div[data-schemapath="root.DeniedAlternatives"]')
        .addClass('alert-success')
    }
    let ccheck = ed.generate_label_checker(i, 40, 17)
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
      d.className = 'input-lg form-control inputor'
      $(d).atwho(color_autocompletion)
          .atwho(tag_autocompletion)
          .on("inserted.atwho", function(e,l,be) {
        if (fin) {return} // let autocompleter finish its job
        fin = true
        let pos = e.target.selectionStart
        let old = e.target.value
        e.target.value = old.substr(0, pos-2) + old.substr(pos)
        e.target.selectionStart = pos - 2
        e.target.selectionEnd = pos - 2
        let atwho = $(e.target).data('atwho')
        // show autocompleter with updated suggestions again after a short
        // time to prevent its immediate disappearence
        setTimeout(function() {atwho.dispatch({type: "click"})}, 100)
      })
      if (d.value.length != 0)
      {
        d.rows = Math.max(Math.ceil(d.value.length/27), d.rows)
      }
    })
  // Load names from the json
  $.getJSON("names.json", function(result) {
    $(".inputor").atwho("load", "<", result["tags"])
    $(".inputor").atwho("load", "^", result["colors"])
    endings = result["endings"]
  })
  $(this.holder).find('div[data-schemapath^="root.Files."]').each(function(i,c){
      let prefix_len = "root.Files.".length
      let path = $(c).attr('data-schemapath').substring(prefix_len)
      $(c).find('button').hide()
      $(c).find('[data-schemapath^="root.Files.' + path + '."]').each(function(i,p)
      {
        let internal_path = $(p).find('input')[0].value
        $(p).parent().append('<p>' + internal_path + '</p>')
        $(p).hide()
      })
      referenceLookup(c, path)
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

theEditor.prototype.json_onload = function (data, gotopattern)
{
  this.json = []
  this.navbar.innerHTML = ""
  let page = 1
  $('#current-filename').text(this.filedata.name)
  let editor = this
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
  let has_untranslated = false
  let ii = 0
  let target_pagestart = 0
  let target_i = -1
  let last_i = 0
  for (let i = 0 ; i < data.length; i += 1)
  {
    let texts = data[i]["Texts"]
    if (gotopattern && (texts["Eng"].match(gotopattern) ||
        (texts["Rus"] && texts["Rus"].match(gotopattern)))){
      target_pagestart = last_i
      target_i = i
    }
    let translated = ("Rus" in texts) && (texts["Rus"].length > 0)
    has_untranslated = has_untranslated || !translated
    if (ii == editors_per_page - 1 | i == data.length - 1)
    {
      let navelement = document.createElement('li')
      navelement.id = 'navbarel-' + last_i
      let navbutton = document.createElement('a')
      navbutton.innerHTML = page
      navbutton.title = page
      navbutton.onclick = get_onclick(last_i)
      if (has_untranslated)
      {
        $(navelement).addClass("untranslated")
      }
      navelement.appendChild(navbutton)
      this.navbar.append(navelement)
      page += 1
      last_i = i+1
      ii = -1 //not 0 due to increment after
      has_untranslated = false
    }
    ii += 1
  }
  this.json = data
  $('#navbarel-' + target_pagestart).addClass('active')
  this.load_part(target_pagestart, target_i)
  if (target_i >=0){
    window.location.hash = '#element-' + target_i
  }
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

theEditor.prototype.open_json = function (content, gotopattern)
{
  let data = $.parseJSON(content)
  this.json_onload(data, gotopattern)
}
