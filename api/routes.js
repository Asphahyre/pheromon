'use strict';

var database = require('../database');
var PRIVATE = require('../PRIVATE.json');
var DEBUG = process.env.NODE_ENV === "development";

module.exports = function(app, debug){

    // --------------> sensor
    app.post('/sensor/create', function(req, res){
        if(req.query.s === PRIVATE.secret || DEBUG) {
            
            console.log('creating sensor', req.body);

            database.Sensors.create(req.body)
            .then(function(data){
                debug('Sensor created', data);
                res.status(201).send(data);
            })
            .catch(function(error){
                res.status(500).send('Couldn\'t create Sensor in database');
                console.log('error in /sensor/create', error);
            });
        } else res.status(403).send({success: false, message: 'No token provided.'});
    });

    app.post('/sensor/update', function(req, res){
        if(req.query.s === PRIVATE.secret || DEBUG) {
            var sim = req.body.sim;

            database.Sensors.update(sim, req.body.delta)
            .then(function(data){
                res.status(200).send(data);
            })
            .catch(function(error){
                res.status(500).send('Couldn\'t update Sensors database');
                console.log('error in /sensor/update/' + sim, error);
            });
        } else res.status(403).send({success: false, message: 'No token provided.'});
    });

    app.get('/sensor/get/:sim', function(req, res){
        var sim = req.params.sim;
        console.log('requesting sensor sim', sim);

        database.Sensors.get(sim)
        .then(function(data){
            // debug('All sensors', data);
            res.status(200).send(data);
        })
        .catch(function(error){
            res.status(500).send('Couldn\'t get sensor from database');
            console.log('error in GET /sensor/' + sim, error);
        });
    });

    app.get('/sensor/getAll', function(req, res){
        database.Sensors.getAll()
        .then(function(data){
            // debug('All sensors', data);
            res.status(200).send(data);
        })
        .catch(function(error){
            res.status(500).send('Couldn\'t gett all sensors database');
            console.log('error in GET /sensor/all', error);
        });
    });

    app.delete('/sensor/delete/:sim', function(req, res){
        if(req.query.s === PRIVATE.secret || DEBUG) { 
            var sim = req.params.sim;
            console.log('deleting', sim);

            database.Sensors.delete(sim)
            .then(function(data){
                res.status(200).send(data);
            })
            .catch(function(error){
                res.status(500).send('Couldn\'t delete Sensor from database');
                console.log('error in DELETE /sensor/' + sim, error);
            });
        } else res.status(403).send({success: false, message: 'No token provided.'});
    });

    app.delete('/sensor/deleteAll', function(req, res){
        if(req.query.s === PRIVATE.secret || DEBUG) {     
            console.log('deleting all sensors');

            database.Sensors.deleteAll()
            .then(function(data){
                res.status(200).send(data);
            })
            .catch(function(error){
                res.status(500).send('Couldn\'t delete all Sensors from database');
                console.log('error in DELETE /sensor/all', error);
            });
        } else res.status(403).send({success: false, message: 'No token provided.'});
    });

    // --------------> place
    app.post('/place/create', function(req, res){
        if(req.query.s === PRIVATE.secret || DEBUG) {       
            console.log('creating place', req.body);

            database.Places.create(req.body)
            .then(function(data){
                debug('Place created', data);
                res.status(201).send(data);
            })
            .catch(function(error){
                res.status(500).send('Couldn\'t create Place in database');
                console.log('error in /place/create/', error);
            });
        } else res.status(403).send({success: false, message: 'No token provided.'});
    });

    app.post('/place/update', function(req, res){
        if(req.query.s === PRIVATE.secret || DEBUG) { 
            var id = req.body.id;

            database.Places.update(id, req.body.delta) // req.body.delta : {name,lat,lon}
            .then(function(data){
                res.status(200).send(data);
            })
            .catch(function(error){
                res.status(500).send('Couldn\'t update Places database');
                console.log('error in /place/update/' + id, error);
            });
        } else res.status(403).send({success: false, message: 'No token provided.'});
    });

    app.get('/place/get/:id', function(req, res){
        var id = req.params.id;
        console.log('requesting place id', id);

        database.Places.get(id)
        .then(function(data){
            // debug('All places', data);
            res.status(200).send(data);
        })
        .catch(function(error){
            res.status(500).send('Couldn\'t get place from database');
            console.log('error in /place/get/' + id, error);
        });
    });

    app.get('/place/getAll', function(req, res){
        database.Places.getAll()
        .then(function(data){
            // debug('All places', data);
            res.status(200).send(data);
        })
        .catch(function(error){
            res.status(500).send('Couldn\'t get all places from database');
            console.log('error in /place/getAll', error);
        });
    });

    app.delete('/place/delete/:id', function(req, res){
        if(req.query.s === PRIVATE.secret || DEBUG) { 
            var id = req.params.id;
            console.log('deleting place id', id);

            database.Places.delete(id)
            .then(function(data){
                res.status(200).send(data);
            })
            .catch(function(error){
                res.status(500).send('Couldn\'t delete Place from database');
                console.log('error in /place/delete/' + id, error);
            });
        } else res.status(403).send({success: false, message: 'No token provided.'});
    });

    app.delete('/place/deleteAll', function(req, res){
        if(req.query.s === PRIVATE.secret || DEBUG) {  
            console.log('deleting all sensors');

            database.Places.deleteAll()
            .then(function(data){
                res.status(200).send(data);
            })
            .catch(function(error){
                res.status(500).send('Couldn\'t delete all Places from database');
                console.log('error in /place/deleteAll', error);
            });
        } else res.status(403).send({success: false, message: 'No token provided.'});
    });

    // complex queries

    // get latest measurement of one type for one place
    app.get('/placeLatestMeasurement/:place/:type', function(req, res){
        var type = req.params.type;
        var place = req.params.place;

        database.complexQueries.placeLatestMeasurement(place, type)
        .then(function(data){
            res.status(200).send(data);
        })
        .catch(function(error){
            console.log('error in /placeLatestMeasurement', error);
            res.status(500).send('Couldn\'t get current live affluence database');
        });
    });

    // get latest measurement of one type for all places
    app.get('/placesLatestMeasurement/:type', function(req, res){
        var type = req.params.type;

        database.complexQueries.placesLatestMeasurement(type)
        .then(function(data){
            res.status(200).send(data);
        })
        .catch(function(error){
            console.log('error in /placesLatestMeasurement', error);
            res.status(500).send('Couldn\'t get current live affluence database');
        });
    });

    // get various measurements for one place
    app.post('/measurements/place', function(req, res){
        var placeId = req.body.id;
        var types = req.body.types;
        console.log('requesting place id', placeId, types);
        
        database.complexQueries.getPlaceMeasurements(placeId, types)
        .then(function(data){
            res.status(200).send(data);
        })
        .catch(function(error){
            res.status(500).send('Couldn\'t get place measurements from database');
            console.log('error in /measurements/place/' + placeId, error);
        });
    });

    // get various measurements types for one sensor
    app.post('/measurements/sensor', function(req, res){

        var sim = req.body.sim;
        var types = req.body.types;

        console.log('requesting sensor measurements for sensor', sim);
        database.complexQueries.getSensorMeasurements(sim, types)
        .then(function(data){
            console.log('data', data);
            res.status(200).send(data);
        })
        .catch(function(error){
            res.status(500).send('Couldn\'t sensor measurements from database');
            console.log('error in /measurements/sensor/' + sim, error);
        });
    });

    // get all places
    app.get('/allPlacesInfos', function(req, res){
        database.complexQueries.getAllPlacesInfos()
        .then(function(data){
            // debug('All places infos', data);
            res.status(200).send(data);
        })
        .catch(function(error){
            res.status(500).send('Couldn\'t get all place info from database');
            console.log('error in /allPlacesInfos', error);
        });
    });

};
