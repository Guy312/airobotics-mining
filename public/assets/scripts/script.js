//9974
var app = angular.module('myModule', ['ngRoute']);

app.config(['$routeProvider', function ($routeProvider) {
    $routeProvider
        .when('/', { controller: 'HomeController', templateUrl: '../secure/home' })
        .otherwise({ redirectTo: '/' });
}]);

app.controller("HomeController", function ($scope, $http) {
    $scope.piles = new Object();
    $scope.pileNames = new Object();

    $scope.init = function () {
        $http({
            method: 'GET',
            url: '/api/piles'
        }).then(function successCallback(response) {

            console.log("Got successful piles response");

            $scope.piles = response.data;

            var pileNames = [...new Set(response.data.map(pile => pile.pile_name))];

            $scope.pileNames = pileNames;

            //select (none)
            $scope.pileName = "";

        }, function errorCallback(response) {
            console.log("Error while fetching piles from server " + response);
        });
    };

    $scope.populateDates = function (pileName) {

        $scope.dates = $scope.piles.filter((pile) => pile.pile_name.localeCompare(pileName.trim()) === 0);
        $scope.pileId = "";
    };

    $scope.selectPile = function (id) {

        $scope.selectedPile = $scope.piles.find((pile) => pile.id == id);
        if (!$scope.selectedPile) {
            return;
        }

        var job_id = $scope.selectedPile.job_id;

        $scope.selectedPileImage = new Object();

        $http({
            method: 'GET',
            url: '/api/pileImage/'.concat(job_id)
        }).then(function successCallback(response) {
            console.log("Got pile image response");
            $scope.selectedPileImage = response.data;
        }, function errorCallback(response) {
            console.log("Error while fetching pile image  " + response);
        });
    };

    $scope.getPile = function (pileID) {
        $scope.pile = new Object();

        $http({
            method: 'GET',
            url: '/api/pile',
            data: { pID: pileID }
        }).then(function successCallback(response) {
            console.log("Got pile successful response");
            $scope.pile = response.data;
        }, function errorCallback(response) {
            console.log("Error while fetching pile from server " + response);
        });
    };

    // Call the init function to load the piles
    $scope.init();
});


app.controller("LoginController", function ($scope, $http) {

    $scope.init = function () {
        $http({
            method: 'GET',
            url: '/login'
        }).then(function successCallback(response) {
            console.log("Got login post");

        }, function errorCallback(response) {
            console.log("Error while fetching piles from server " + response);
        });
    };

    $scope.init();
});

