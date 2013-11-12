var api_url = 'http://ic05-api.emilienkenler.com';

function GlobalCtrl($scope) {
  $scope.error = false;
}

// Crawl status
function StatusCtrl($scope, $http, $timeout) {
  // Read with polling
  (function poll(){
    if(!$scope.retry){
      $scope.retry = 500; 
    }
    $http.get(api_url + '/state').success(function(data) {
      $scope.$parent.error = false;
      $scope.working = data.working;
      $scope.visited = data.visited;
      $timeout(poll, $scope.retry);
    }).error(function(data, status){
      $scope.$parent.error = "Impossible de récupérer l'état";
      console.error(data);
      $scope.retry *= 2;
      $timeout(poll, $scope.retry);
    });
  })();
}

// Seeds
function SeedCtrl($scope, $http) {
  // Get
  $http.get(api_url + '/seed').success(function(data) {
    $scope.$parent.error = false;
    $scope.seeds = data;
  }).error(function(data, status){
    $scope.$parent.error = "Impossible de récupérer les seed";
    console.error(data);
  });
  
  // Add
  $scope.addSeed = function() {
    if(!$scope.newSeed) return;
    if($scope.newSeed.match(/^https?:\/\//) == null){
      $scope.newSeed = "http://" + $scope.newSeed;
    }
    var postData = { url: $scope.newSeed };
    $http.post(api_url + '/seed', postData).success(function(data) {
      $scope.$parent.error = false;
      $scope.seeds.push($scope.newSeed);
      $scope.newSeed = "";
    }).error(function(data, status){
      $scope.$parent.error = "Impossible d'ajouter le seed";
      console.error(data);      
    });
  };

  // Delete
  $scope.deleteSeed = function(index) {
    var data = { url: $scope.seeds[index] };
    $http.delete(api_url + '/seed', {params: data}).success(function(data) {
      $scope.$parent.error = false;
      $scope.seeds.splice(index, 1);
    }).error(function(data, status){
      $scope.$parent.error = "Impossible de supprimer le seed";
      console.error(data);      
    });
  };
}

// Profondeur
function DepthCtrl($scope, $http) {
  // Get
  $http.get(api_url + '/depth').success(function(data) {
    $scope.$parent.error = false;
    $scope.depth = data.depth;
  }).error(function(data, status){
    $scope.$parent.error = "Impossible de récupérer la profondeur";
    console.error(data);
  });
  
  // Enregistrement
  $scope.DepthSet = function(){
    var postData = { depth: $scope.depth };
    $http.post(api_url + '/depth', postData).success(function(data) {
      $scope.$parent.error = false;
      $scope.depth = postData.depth;
    }).error(function(data, status){
      $scope.$parent.error = "Impossible de sauvegarder la profondeur";
      console.error(data);
    });
  };
}

// Filtres
function FilterCtrl($scope, $http) {
  // Lecture
  $http.get(api_url + '/filter').success(function(data) {
    $scope.$parent.error = false;
    $scope.filters = data;
  }).error(function(data, status){
    $scope.$parent.error = "Impossible de récupérer les filtres";
    console.error(data);
  });
}


// ancien js
if(0){
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
}