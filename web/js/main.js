function GlobalCtrl($scope) {
  $scope.error = false;

  $('[data-toggle=tooltip]').tooltip({
    container: 'body'
  });

  // Reset all the GUI
  $scope.resetApp = function(){
    $scope.$broadcast("resetApp");
  };

  // Reset all the GUI
  $scope.resetData = function(){
    $scope.sigInst.emptyGraph();
    $scope.sigInst.draw();
  };
  
  // Handle databox update
  $scope.$on("databoxUpdate", function(event, data){
    $scope.$broadcast("databoxUpdateChild", data);
  });
}

// Crawl status
function StatusCtrl($scope, $http, $timeout, $compile) {
  // Read with polling
  (function poll(){
    if(!$scope.retry){
      $scope.retry = 1000;
    }
    $http.get(api_url + '/state').success(function(data) {
      $scope.$parent.error = false;
      $scope.working = data.working;
      $scope.visited = data.visited;
      // TODO Update $scope.crawlStatus
      $timeout(poll, $scope.retry);
    }).error(function(data, status){
      $scope.$parent.error = "Impossible de récupérer l'état";
      console.error("Cannot get status:", data);
      $scope.retry *= 2;
      $timeout(poll, $scope.retry);
    });
  })();

  // Start button
  $scope.startCrawl = function() {
    if($scope.crawlStatus == 0){
      $scope.popover.popover('show');
    }
    else {
      $scope.doStartCrawl();
    }
  };

  // Clear data then start crawl
  $scope.clearAndStartCrawl = function(){
    // Close popover
    $scope.popover.popover('hide');

    // Drop all data
    $http.post(api_url + '/reset', { type: 1 }).success(function(data) {
      // Clear sigmajs
      $scope.$parent.sigInst.emptyGraph();
      $scope.$parent.sigInst.draw();
      
      $scope.$parent.error = false;
      $scope.doStartCrawl();
    }).error(function(data, status){
      $scope.$parent.error = "Impossible de supprimer les données existantes";
      console.error(data);
    });
  };
  
  // Start the crawl
  $scope.doStartCrawl = function(){
    $scope.crawlStatus = 1;
    $http.post(api_url + '/start').success(function(data) {
      $scope.$parent.error = false;
    }).error(function(data, status){
      $scope.$parent.error = "Impossible de démarrer le crawl";
      console.error(data);
    });
  };

  // Just close the popover
  $scope.doNotStartCrawl = function(){
    $scope.popover.popover('hide');
  };
  
  // Pause button
  $scope.pauseCrawl = function(index) {
    $scope.crawlStatus = 2;
    $http.post(api_url + '/pause').success(function(data) {
      $scope.$parent.error = false;
    }).error(function(data, status){
      $scope.$parent.error = "Impossible de mettre le crawl en pause";
      console.error(data);
    });
  };

  // Stop button
  $scope.stopCrawl = function(index) {
    $scope.crawlStatus = 0;
    $http.post(api_url + '/stop').success(function(data) {
      $scope.$parent.error = false;
    }).error(function(data, status){
      $scope.$parent.error = "Impossible d'arrêter le crawl";
      console.error(data);
    });
  };
  
  // Handle app reset
  $scope.$on("resetApp", function(event){
    $scope.working = 0;
    $scope.visited = 0;
  });
  
  // The crawl status: 0=stop, 1=play, 2=pause
  $scope.crawlStatus = 0;
  
  // Popover to confirm clear on start
  $scope.popover = $('button[data-toggle=popover]').popover().on('shown', function(){
    var popover = $('body').find('.popover .popover-content');
    popover.html($compile(popover.html())($scope));
  });
  
  // API url used in download links
  $scope.apiUrl = api_url;
}

// Config tools controller
function ConfigCtrl($scope, $http) {
  // Reset button
  $scope.resetConfig = function(index) {
    $http.post(api_url + '/reset', { type: 2 }).success(function(data) {
      $scope.$parent.resetApp();
      $scope.$parent.error = false;
    }).error(function(data, status){
      $scope.$parent.error = "Impossible de réinitialiser la configuration";
      console.error(data);
    });
  };
}

// Graph control toolbox
function ToolboxCtrl($scope) {
  // Zoom in/out buttons
  $scope.zoom = function(coef) {
    var a = $scope.$parent.sigInst._core;
    $scope.$parent.sigInst.zoomTo(a.domElements.nodes.width/2, a.domElements.nodes.height/2, a.mousecaptor.ratio * coef);
  };

  // Force Atlas button
  $scope.forceAtlas = false;
  $scope.toggleForceAtlas = function() {
    if($scope.forceAtlas){
      $scope.$parent.sigInst.stopForceAtlas2();
    }
    else {
      $scope.$parent.sigInst.startForceAtlas2();
    }
    $scope.forceAtlas = !$scope.forceAtlas;
  };
}

// Databox control
function DataboxCtrl($scope) {
  // Handle databox update
  $scope.$on("databoxUpdateChild", function(event, data){
    $scope.data = data;
  });
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
  
  // Handle app reset
  $scope.$on("resetApp", function(event){
    $scope.seeds = [];
    $scope.newSeed = '';
  });
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

  // Save
  $scope.DepthSet = function(){
    var postData = { depth: $scope.depth };
    $scope.working = true;
    $http.post(api_url + '/depth', postData).success(function(data) {
      $scope.$parent.error = false;
      $scope.depth = postData.depth;
      $scope.working = false;
      $scope.done = true;
      setTimeout(function(){$scope.done = false}, 1000);
    }).error(function(data, status){
      $scope.$parent.error = "Impossible de sauvegarder la profondeur";
      console.error(data);
      $scope.working = false;
      $scope.failed = true;
      setTimeout(function(){$scope.failed = false}, 1000);
    });
  };
  
  // Handle app reset
  $scope.$on("resetApp", function(event){
    $scope.depth = 1;
  });
}

// Filters
function FilterCtrl($scope, $http) {
  $scope.filters = {
    url: [],
    title: [],
    body: []
  };
  
  // Get
  $http.get(api_url + '/filter').success(function(data) {
    $scope.$parent.error = false;
    $scope.filters = data;
  }).error(function(data, status){
    $scope.$parent.error = "Impossible de récupérer les filtres";
    console.error(data);
  });

  // Add
  $scope.addFilter = function(target) {
    if(!$scope.newFilterData[target]) return;
    var keywords = $scope.newFilterData[target].split(',');
    for(var index in keywords) {
      var val = keywords[index].trim();
      var postData = { keyword: val, target: target };
      $scope.newFilterQueries[target]++;
      $http.post(api_url + '/filter', postData).success(function(val){
        return function(data) {
          $scope.newFilterQueries[target]--;
          $scope.filters[target].push(val);

          if($scope.newFilterQueries[target] == 0){
            $scope.$parent.error = false;
            $scope.newFilterData[target] = "";          
          }
        }
      }(val)).error(function(data, status){
        $scope.newFilterQueries[target]--;
        $scope.$parent.error = "Impossible d'ajouter le " + target;
        console.error(data);
      });
    }
  };

  // Inputs for filters
  $scope.newFilterData = {
    url: "",
    title: "",
    body: ""
  };
  
  // Number of active queries for each filter
  $scope.newFilterQueries = {
    url: 0,
    title: 0,
    body: 0
  };

  // Delete
  $scope.deleteFilter = function(target, index) {
    var data = { keyword: $scope.filters[target][index], target: target };
    $http.delete(api_url + '/filter', { params: data }).success(function(data) {
      $scope.$parent.error = false;
      $scope.filters[target].splice(index, 1);
    }).error(function(data, status){
      $scope.$parent.error = "Impossible de supprimer le " + target;
      console.error(data);
    });
  };
  
  // Handle app reset
  $scope.$on("resetApp", function(event){
    $scope.newFilterAddress = '';
    $scope.newFilterTitle = '';
    $scope.newFilterContent = '';
    $scope.filters = [];
  });
}

String.prototype.hashColor = function(){
  var hash = 0;
  if (this.length == 0) return hash;
  for (i = 0; i < this.length; i++) {
      char = this.charCodeAt(i);
      hash = ((hash<<5)-hash)+char;
      hash = hash & hash;
  }
  if(hash < 0) hash *= -1;
  hash %= 16777215;
  hash = hash.toString(16);
  return hash.length < 6 ? new Array(6 - hash.length + 1).join('0') + hash : hash;
}

function SigmaCtrl($scope, $http, $timeout) {
  // Instanciate sigma.js and customize it
  $scope.$parent.sigInst = sigma.init(document.getElementById('sigma')).drawingProperties({
    defaultLabelColor: '#fff',
    defaultLabelSize: 14,
    defaultLabelBGColor: '#fff',
    defaultLabelHoverColor: '#000',
    labelThreshold: 8,
    defaultEdgeType: 'curve'
  }).graphProperties({
    minNodeSize: 0.5,
    maxNodeSize: 5,
    minEdgeSize: 1,
    maxEdgeSize: 1
  }).mouseProperties({
    minRatio: 0.75, // How far can we zoom out?
    maxRatio: 20, // How far can we zoom in?
  });
  
  // Higlight linked nodes when hovering
  var greyColor = '#666';
  $scope.$parent.sigInst.bind('overnodes',function(event){
    $scope.mouseHover = true;
    $scope.$digest();
    var nodes = event.content;
    var neighbors = {};
    $scope.$parent.sigInst.iterEdges(function(e){
      if(nodes.indexOf(e.source)<0 && nodes.indexOf(e.target)<0){
        if(!e.attr['grey']){
         e.attr['true_color'] = e.color;
         e.color = greyColor;
         e.attr['grey'] = 1;
        }
      }else{
        e.color = e.attr['grey'] ? e.attr['true_color'] : e.color;
        e.attr['grey'] = 0;
        neighbors[e.source] = 1;
        neighbors[e.target] = 1;
      }
      }).iterNodes(function(n){
      if(!neighbors[n.id]){
        if(!n.attr['grey']){
          n.attr['true_color'] = n.color;
          n.color = greyColor;
          n.attr['grey'] = 1;
        }
      }else{
        n.color = n.attr['grey'] ? n.attr['true_color'] : n.color;
        n.attr['grey'] = 0;
      }
    }).draw(2,2,2);
  }).bind('outnodes',function(){
    $scope.mouseHover = false;
    $scope.$digest();
    $scope.$parent.sigInst.iterEdges(function(e){
      e.color = e.attr['grey'] ? e.attr['true_color'] : e.color;
      e.attr['grey'] = 0;
    }).iterNodes(function(n){
      n.color = n.attr['grey'] ? n.attr['true_color'] : n.color;
      n.attr['grey'] = 0;
    }).draw(2,2,2);
  });

  // Show details on click  
  $scope.$parent.sigInst.bind('upnodes', function(event) {
    var node;
    $scope.$parent.sigInst.iterNodes(function(n){
      node = n;
    }, [event.content[0]]);

    $scope.$emit("databoxUpdate", {
      label: node.label,
      shortLabel: (node.label.length < 40) ? node.label : node.label.substr(0, 39) + "..."
    });
  });
  
  $scope.lastDraw = 0;
  $scope.timerSetDraw = false;
  function redrawGraph(){
    if(Date.now() - $scope.lastDraw > 500){
      $scope.$parent.sigInst.draw();
      $scope.lastDraw = Date.now();
    }
    else if(!$scope.timerSetDraw){
      $scope.timerSetDraw = true;
      setTimeout(function(){
        redrawGraph();
        $scope.timerSetDraw = false;
      }, 550);
    }
  }
  
  var xhr = new XMLHttpRequest();
  var nodeList = {};
  var edgeList = {};
  var edgeId = 0;
  xhr.onreadystatechange = function() {
    if (this.readyState > 2) {
      var partial_response = this.responseText.split("\n");
      for(var line in partial_response){
        if(partial_response[line]){
          try {
            var node = JSON.parse(partial_response[line]);

            // Add the node to the graph
            if(node && node._id && !nodeList[node._id]){
              nodeList[node._id] = 1;
              var l = document.createElement("a");
              l.href = node._id;
              $scope.$parent.sigInst.addNode(node._id, {
                label: node._id,
                x: Math.random(),
                y: Math.random(),
                color: l.hostname.hashColor(),
                size: 0.8
              });
              redrawGraph();
            }

            // Create the edges
            for(var link in node.links){
              if(nodeList[node.links[link]] && !edgeList[node._id + node.links[link]]){
                $scope.$parent.sigInst.addEdge(edgeId++, node._id, node.links[link]);
                edgeList[node._id + node.links[link]] = 1;
                redrawGraph();
              }
            }
          } catch (e) {
            // This was not JSON, okay.
          }
        }
      }
    }
    // TODO Handle readyState = 4 -> start a new stream, as well as errors
  };
  xhr.open('GET',api_url + '/results.json',true);
  xhr.send();
}

