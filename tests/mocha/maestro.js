'use strict';
require('es6-shim');

var sigCodec = require('pheromon-codecs').signalStrengths;

var mqtt = require('mqtt');
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
var expect = chai.expect;
var assert = chai.assert;

var io = require('socket.io-client');

var request = require('request');
var PRIVATE = require('../../PRIVATE.json');

var database = require('../../database');
var sendReq = require('../../tools/sendNodeReq');
var makeMap = require('../../tools/makeMap');

var prepareAPI = require('../../tools/prepareAPI.js');
var apiOrigin = 'http://api:4000';
var api = prepareAPI(sendReq, apiOrigin);

var socket = io(apiOrigin);

var checkSensor = require('../../api/utils/checkSensor.js');

function createFakeSensor(simId){
    return new Promise(function(resolve, reject){
        var newSensor = mqtt.connect('mqtt://broker:1883', {
            username: simId,
            password: PRIVATE.token,
            clientId: simId
        });

        newSensor.on('connect', function(){
            newSensor.subscribe(simId);
            newSensor.subscribe('all');
            resolve(newSensor);
        });
    });
}

describe('Maestro testing', function(){

    this.timeout(2000);

    // before all tests, clear the table
    before('Clearing Sensor table', function(){
        return database.Sensors.deleteAll();
    });

    // after all tests, clear the table
    after('Clearing Sensor table', function(){

        return database.Measurements.deleteAll() 
        .then(function(){
            return database.Sensors.deleteAll();
        });
    });

    describe('Maestro utils', function(){
        // after each test, clear the table
        afterEach('Clearing Sensor Table', function(){
            return database.Sensors.deleteAll();
        });

        describe('checkSensor utils', function() {
        
            var sensor = {
                name: 'Sensor1',
                sim: '290'
            };

            var sim2sensor = {};

            it('checkSensor should register unknown sensor', function () {
                return checkSensor(sensor.sim)
                .then(function(){
                    return database.Sensors.getAll()
                    .then(function(sensors){
                        expect(sensors.length).to.deep.equal(1);
                    });
                });
            });

            it('checkSensor should not register known sensor', function () {
                return checkSensor(sensor.sim)
                .then(function(){
                    return database.Sensors.getAll()
                    .then(function(sensors){
                        expect(sensors.length).to.deep.equal(1);
                    });
                });
            });

            it('checkSensor should not add already existing output', function () {
                return checkSensor(sensor.sim, 'wifi')
                .then(function(){
                    return checkSensor(sensor.sim, 'wifi');
                })
                .then(function(){
                    return checkSensor(sensor.sim, 'signal');
                })
                .then(function(){
                    return database.Sensors.get(sensor.sim)
                    .then(function(sensor){
                        expect(sensor.outputs.length).to.deep.equal(1);
                    });
                });
            });
        });

    });

    describe('Fake Sensor', function() {

        var fakeSensor;
        var i = 0;
        var simId;

        // This is mainly to override the 'onMessage' event handler.
        beforeEach('Creating Fake Sensor', function(){
            i++;
            simId = 'simNumber' + i;
            return createFakeSensor(simId)
            .then(function(sensor){
                fakeSensor = sensor;
            });
        });

        it('Maestro should register unknown sensor', function () {

            fakeSensor.publish('init/' + simId, '');
            
            return new Promise(function(resolve, reject){
                setTimeout(function(){
                    resolve(api.getAllSensors()
                    .then(function(sensors){
                        expect(sensors[0].sim).to.deep.equal('simNumber1');
                    }));
                }, 200);
            });
        });

        it('Maestro should send back init command when asked', function () {
            // sensor sends '' on topic 'init/simId'
            // then receives 'init params' on topic 'simId'

            return new Promise(function(resolve, reject){
                fakeSensor.on('message', function(topic, message){
                    if(topic === simId || 'all') {
                        var argsplit = message.toString().split(' ');

                        expect(argsplit[0]).to.deep.equal('init');
                        // check parameters are numbers
                        expect(Number.isNaN(Number(argsplit[1]))).to.be.false;
                        expect(Number.isNaN(Number(argsplit[2]))).to.be.false;
                        expect(Number.isNaN(Number(argsplit[3]))).to.be.false;
                        // check for proper datetime
                        expect(Date.parse(argsplit[4])).to.be.a('number');
                        resolve();
                    }
                });

                fakeSensor.publish('init/' + simId, '');
            });
        });

        it('Maestro should register output status update in DB', function () {

            fakeSensor.publish('status/' + simId + '/wifi', 'recording');            
            
            return new Promise(function(resolve, reject){
                setTimeout(function(){
                    resolve(api.getSensor(simId)
                    .then(function(sensor){
                        var outputs = makeMap(sensor.outputs, 'type');
                        expect(outputs.get('wifi').status).to.deep.equal('recording');
                    }));

                }, 300);
            });
        });

        // add test for client status

        it('Pushing wifi measurements should register measurements in DB', function () {

            var measurement = {
                date: new Date(),
                devices: [{
                    signal_strength: -10,
                    ID: 'myID1'
                },
                {
                    signal_strength: -19,
                    ID: 'myID2'
                },
                {
                    signal_strength: -39,
                    ID: 'myID3'
                }]
            };

            return sigCodec.encode(measurement)
            .then(function(encoded){
                fakeSensor.publish('measurement/' + simId + '/wifi', encoded);

                var data = {
                    sim: simId,
                    types: ['wifi']
                };

                return new Promise(function(resolve, reject){
                    setTimeout(function(){

                        resolve(api.measurementsSensor(data)
                        .then(function(measurements){
                            expect(measurements[0].value[0]).to.deep.equal(-39); // signal strengths are sorted when encoded.
                            expect(measurements[0].entry).to.equal(3);
                            expect(Date.parse(measurements[0].date)).to.be.a('number');
                        }));

                    }, 200);
                });
            });
        });

        it('Emitting commands through socket should send command to sensors', function(){
            return new Promise(function(resolve, reject){
                fakeSensor.on('message', function(topic, message){

                    if(topic === simId || 'all') {
                        expect(message.toString()).to.deep.equal('myCommand');
                        resolve();
                    }
                });

                socket.emit('cmd', {
                    command: 'myCommand',
                    to: [simId]
                });

            });
        });

    });
});

