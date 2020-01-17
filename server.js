require('dotenv').config()
const express = require('express');
const app = express();
const port = 5000;
const key = process.env.GOOGLE_API_KEY
const vehicles = require('./vehicle.json')
const trips = require('./trips.json')
const axios = require('axios')
const bodyParser = require('body-parser')
const moment = require('moment')
const polyline = require('@mapbox/polyline')

// converts input string to url readable
const parseURL = string => string.replace(/\s/g, '+')
// converts input time(string) to url readable
const timeConversion = time => moment(moment(time).toISOString()).unix()
//formats time from google server response so it can be used in moment
const formatTime = timeString => timeString.replace(/['hour']/g, '').replace(/['mins']/g, '')

app.use(bodyParser.json())

app.get('/', async (req, res) => {
  const pickupTime = timeConversion(trips[0].pickupTime)
  const clientPickupAddr = parseURL(trips[0].pickup)
  const dropOffAddr = parseURL(trips[0].dropoff)

// the following 'helper' function i made simply takes in an array of vehicles and encodes
// their lat/lng so they can be passed properly into a URL
  const encodeCoords = vehicleList => {
    let encoded = []

    vehicleList.map(car => {
      let encodedNums = 
        polyline.encode([[car.coords.lat, car.coords.lng]])
        .replace(/^/, 'enc:')
        .concat(':|')

      encoded.push(encodedNums)
    })

    const formatted = encoded.toString().replace(/[,]/g, '')
    return formatted;
  }
  
  const urlString = encodeCoords(vehicles)
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?units=imperial&origins=${urlString}&destinations=${dropOffAddr}&key=${key}&traffic_model=pessimistic&departure_time=${pickupTime}`

  await axios.get(url).then(response => {
    let closestCars = []
    response.data.rows.map((el, i) => {
      const distance = parseInt(el.elements[0].distance.text)
      const traffic = formatTime(el.elements[0].duration_in_traffic.text)

      console.log(traffic)

      if(distance < 55) {
        closestCars.push(i)
      }
    })
    res.send(closestCars)
  })

})

app.listen(port, console.log(`now listening on ${port}`))