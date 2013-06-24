//fichier main.js
//permet d'attendre la fin du chargement de la page avant d'exécuter la page
$(document).ready(function(){
  var api_url = 'http://ic05-api.emilienkenler.com';
  (function poll(){
    $.ajax({
      type: 'GET',
      url: api_url + '/state',
      crossDomain: true,
      dataType: 'json',
      timeout: 30000,
      success: function(data){
        $("#working").text(data.working);
        $("#visited").text(data.visited);
      },
      complete: poll
    }).fail(function(jqXHR, textStatus) { console.log('Error: ' + textStatus); });
  })();
  $.ajax({
    type: 'GET',
    url: api_url + '/seed',
    crossDomain: true,
    dataType: 'json',
    timeout: 0,
    success: function(data) {
      for(var i = 0; i < data.length; i++) {
        $('#seed-list').append('<li>'+data[i]+'</li>');
      }
    }
  }).fail(function(jqXHR, textStatus) { console.log('Error: ' + textStatus); });
  //pour les profodeur
  $.ajax({
    type: 'GET',
    url: api_url + '/depth',
    crossDomain: true,
    dataType: 'json',
    timeout: 0,
    success: function(data) {
        $('#profondeur input').val(data.depth);
    }
  }).fail(function(jqXHR, textStatus) { console.log('Error: ' + textStatus); });
  $.ajax({
    type: 'GET',
    url: api_url + '/filter',
    crossDomain: true,
    dataType: 'json',
    timeout: 0,
    success: function(data) {
        for(var i = 0; i < data.url.length; i++) {
        $('#url-list').append('<li>'+data.url[i]+'</li>');
      }
        for(var i = 0; i < data.title.length; i++) {
        $('#title-list').append('<li>'+data.title[i]+'</li>');
      }
        for(var i = 0; i < data.body.length; i++) {
        $('#body-list').append('<li>'+data.body[i]+'</li>');
      }
    }
  }).fail(function(jqXHR, textStatus) { console.log('Error: ' + textStatus); });
  // ici on récupere l id du button
  $('#seed button').on ("click", function() {
    var val = $('#seed input').val(); // on recupere la valeur du champs
    $.ajax({
      type: 'POST',
      url: api_url + '/seed',
      crossDomain: true,
      data: { url: val }, //equivalent a un tableau associatif
      dataType: 'json',
      timeout: 0,
      success: function(data) {
        $('#seed-list').append('<li>'+data.url+'</li>');
      }
    }).fail(function(jqXHR, textStatus) { console.log('Error: ' + textStatus); });
  });
  // ici fonction pour start
  $('#start').on ("click", function() {
    $.ajax({
      type: 'POST',
      url: api_url + '/start',
      crossDomain: true,
      dataType: 'json',
      timeout: 0,
      success: function(data) {
      }
    }).fail(function(jqXHR, textStatus) { console.log('Error: ' + textStatus); });
  });
  // ici fonction pour stop
  $('#stop').on ("click", function() {
    $.ajax({
      type: 'POST',
      url: api_url + '/stop',
      crossDomain: true,
      dataType: 'json',
      timeout: 0,
      success: function(data) {
      }
    }).fail(function(jqXHR, textStatus) { console.log('Error: ' + textStatus); });
  });
  // ici fonction pour reset
  $('#reset').on ("click", function() {
    var reset_data =$('#reset_data').is(':checked');
    var setting =$('#reset_setting').is(':checked');
    var type;
    if(reset_data && setting) type = 0;
    else if(reset_data && !setting) type = 1;
    else if(!reset_data && setting) type = 2;
    else return;
    $.ajax({
      type: 'POST',
      url: api_url + '/reset',
      data: { type: type },
      crossDomain: true,
      dataType: 'json',
      timeout: 0,
      success: function(data) {
        if(setting)
        {
          $('input').val('');
          $('#seed-list').html('');
          $('#url-list').html('');
          $('#title-list').html('');
          $('#body-list').html('');
        }
      }
    }).fail(function(jqXHR, textStatus) { console.log('Error: ' + textStatus); });
  });
  // ici on récupere l id du button profodeur
  $('#profondeur button').on ("click", function() {
    var val = $('#profondeur input').val(); // on recupere la valeur du champs
    $.ajax({
      type: 'POST',
      url: api_url + '/depth',
      crossDomain: true,
      data: { depth: val }, //equivalent a un tableau associatif
      dataType: 'json',
      timeout: 0,
      success: function(data) {
        $('#profondeur input').val(val);
      }
    }).fail(function(jqXHR, textStatus) { console.log('Error: ' + textStatus); });
  });
  // ici on récupere l id de l'url
  $('#url button').on ("click", function() {
    var val = $('#url input').val(); // on recupere la valeur du champs
    $.ajax({
      type: 'POST',
      url: api_url + '/filter',
      crossDomain: true,
      data: { keyword:val, target:'url' }, //equivalent a un tableau associatif
      dataType: 'json',
      timeout: 0,
      success: function(data) {
        $('#url-list').append('<li>'+val+'</li>');
        $('#url input').val('');
      }
    }).fail(function(jqXHR, textStatus) { console.log('Error: ' + textStatus); });
  });
  // ici on récupere l id title
  $('#title button').on ("click", function() {
    var val = $('#title input').val(); // on recupere la valeur du champs
    $.ajax({
      type: 'POST',
      url: api_url + '/filter',
      crossDomain: true,
      data: { keyword:val, target:'title'}, //equivalent a un tableau associatif
      dataType: 'json',
      timeout: 0,
      success: function(data) {
      $('#title-list').append('<li>'+val+'</li>');
      $('#title input').val('');
      }
    }).fail(function(jqXHR, textStatus) { console.log('Error: ' + textStatus); });
  });
  // ici on récupere l id body
  $('#body button').on ("click", function() {
    var val = $('#body input').val(); // on recupere la valeur du champs
    $.ajax({
      type: 'POST',
      url: api_url + '/filter',
      crossDomain: true,
      data: {  keyword:val, target:'body' }, //equivalent a un tableau associatif
      dataType: 'json',
      timeout: 0,
      success: function(data) {
        $('#body-list').append('<li>'+val+'</li>');
        $('#body input').val('');
      }
    }).fail(function(jqXHR, textStatus) { console.log('Error: ' + textStatus); });
  });
});
