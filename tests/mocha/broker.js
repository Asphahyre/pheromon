"use strict";

require('es6-shim');

var net = require('net');
var chai = require('chai');

var expect = chai.expect;
var assert = chai.assert;

// chai.use(require('chai-as-promised'));

var request = require('request');
var sendReq = require('../../tools/sendNodeReq');
var PRIVATE = require('./PRIVATE.json');

var prepareAPI = require('../../tools/prepareAPI.js');

var makeTcpReceiver = require('../../tools/makeTcpReceiver');

var origin = 'http://broker:5100';
var apiOrigin = 'http://api:4000';
var api = prepareAPI(sendReq, apiOrigin);

describe('Sensor initialization', function() {

	this.timeout(2000);

	var fakeSensor;

	// get host ip and clean db
	before(function(ready){
        sendReq('DELETE', apiOrigin + '/sensor/deleteAll')
        .then(function(){
            ready();
        })
        .catch(function(err){
            console.log('err', err);
            throw err;
        });
	});

	// simulate sensor
	beforeEach(function(ready){
        console.log('socket connection');
        var socket = net.connect({
            host: 'broker',
            port: 5100
        });

        socket.on('connect', function(){
            fakeSensor = makeTcpReceiver(socket, "\n");
            fakeSensor.send = socket.write.bind(socket);
            ready();
        });

	});

	it('broker should register unknown sensor if token ok', function (done) {

		// check if sensor properly persisted in db
		fakeSensor.on('message', function(message) {
            sendReq('GET', apiOrigin + '/sensor/getAll')
            .then(function(body){
                var sensor = body[0];

                expect(sensor.sim).to.deep.equal("123456677999"); 
                done();
            })
            .catch(function(err){
                console.log('err', err);
                done(err);
            });
    	});

    	// send sensor 
		fakeSensor.send("init 123456677999 " + PRIVATE.token + "\n");	
	});

	it('broker should send config parameters to sensor if token ok', function (done) {
		fakeSensor.on('message', function(message) {
            
    		var args = message.slice(4);
    		var argsplit = args.split(" ");
    		expect(argsplit[0]).to.deep.equal("init");
    		expect(Number.isNaN(Number(argsplit[1]))).to.be.false;
    		expect(Number.isNaN(Number(argsplit[2]))).to.be.false;
    		expect(Number.isNaN(Number(argsplit[3]))).to.be.false;
    		// check for proper datetime
    		expect(Date.parse(argsplit[4])).to.be.a("number");
    		done();
    	});
		fakeSensor.send("init 123456677999 " + PRIVATE.token + "\n");
	});

	it('broker should not register sensor if token not ok', function (done) {
        
		fakeSensor.on('message', function(message) {
    		assert(false);
    		done();
    	});
        
        
    	// if no response from server after 500 ms, consider ignored
    	setTimeout(function(){
    		assert(true);
    		done();
    	}, 500)
		fakeSensor.send("init 123456677999 " + "dummyCode" + "\n");
	});
});

