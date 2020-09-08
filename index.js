const express = require('express');
const fetch = require('node-fetch');
const redis = require('redis');
const { json } = require('express');

const PORT = process.env.PORT || 5000;
const REDIS_PORT = 6379;

const client = redis.createClient(REDIS_PORT);

const app = express();

function setResonse(username, repos) {
    return `<h2>${username} has ${repos} Repos</h2>`
}

//implement middleware for redis
function cache(req, res, next) {
    const { username } = req.params;

    client.get(username, function(err, data) {
        if (err) res.send(err)
        else {
            if (!!data) {
                console.log("From redis cache")
                res.send(setResonse(username, data))
            } else {
                next();
            }
        }
    })
}

async function getPosts(req, res) {
    try {
        console.log("Fetching Posts");
        const { username } = req.params;
        const response = await fetch(`https://api.github.com/users/${username}`);
        const data = await response.json();
        const repos = data.public_repos;
        //set data to redis
        client.setex(username, 3600, repos);
        res.send(setResonse(username, repos));
    } catch (error) {
        console.log(error);
        res.status(500)
    }

}

function deleteCache(req, res) {
    const { username } = req.params;
    client.del(username, function(err, data) {
        if (err) console.log(err);
        else {
            res.send(`cache cleared for ${username}`);
        }
    })
}

app.get("/getPosts/:username", cache, getPosts);

app.get('/clearCache/:username', deleteCache)

app.listen(PORT, function() {
    console.log(`Running on port ${PORT}`);
})