
function get_editor(holder)
{
  var schema = {
    schema : {
      type : "array",
      options:{
        disable_collapse: true,
        disable_array_add: true,
      disable_array_delete: true,
      },
      title : "Переводы файла",
      items: {
        title: "Перевод",
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
  }
  return new JSONEditor(holder, schema)
}
function json_onload(editor, data)
{
  editor.setValue(data);
  $.each($("#editor-holder input[type=url]"), function(i,d){d.disabled=true})
  $.each($("#editor-holder [name$=\"[Eng]\"]"), function(i,d){d.disabled=true})
  $.each($("#editor-holder textarea[name$=\"]\"]"),
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
  
  $.each($("#editor-holder input[type=week]"),
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


function load_json(editor,url)
{
  $.getJSON(url, function(data){json_onload(editor, data)})
}