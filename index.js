const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.lk92epi.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const courseCollection = client.db("studySyncDb").collection("course");
        const reviewCollection = client.db("studySyncDb").collection("review");
        const userCollection = client.db("studySyncDb").collection("users");
        const workCollection = client.db("studySyncDb").collection("works");

        // jwt token api
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            res.send({ token });
        })

        // custom middlewares
        const verifyToken = (req, res, next) => {
            console.log('inside verify tokens', req.headers.authorization);
            if (!req.headers.authorization) {
                return res.status(401).send({ message: 'unauthorized' })
            }
            const token = req.headers.authorization.split(' ')[1];
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                // error
                if (err) {
                    return res.status(401).send({ message: 'unauthorized' })
                }
                // valid
                req.decoded = decoded;
                next();
            })
        }


        // creat user
        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email }
            const existingUser = await userCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: 'user already exists', insertedId: null })
            }
            const result = await userCollection.insertOne(user);
            res.send(result);
        })

        // get users
        app.get('/users', verifyToken, async (req, res) => {
            // console.log(req.headers);
            const result = await userCollection.find().toArray();
            res.send(result);
        })

        // verify user
        app.patch('/users/hr/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    verified: true
                }
            }
            const result = await userCollection.updateOne(filter, updatedDoc)
            res.send(result);
        })

        // make Hr
        app.patch('/users/newhr/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    role: 'HR'
                }
            }
            const result = await userCollection.updateOne(filter, updatedDoc)
            res.send(result);
        })

        // get specific user detiles
        app.get('/users/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await userCollection.findOne(query);
            res.send(result);
        })

        // Fire a User
        app.delete('/users/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await userCollection.deleteOne(query);
            res.send(result);
        })

        // worksheet
        app.post('/worksheet', async (req, res) => {
            const works = req.body;
            const result = await workCollection.insertOne(works);
            res.send(result);
        })

        // load all worksheet data
        app.get('/progress', async (req, res) => {
            const result = await workCollection.find().toArray();
            res.send(result);
        })

        // load worksheet based on email
        app.get('/worksheet', async (req, res) => {
            console.log(req.query.email);
            let query = {};
            if (req.query?.email) {
                query = { email: req.query.email }
            }
            const result = await workCollection.find(query).toArray();
            res.send(result);
        })


        // courses
        app.get('/courses', async (req, res) => {
            const result = await courseCollection.find().toArray();
            res.send(result);
        })

        // reviews
        app.get('/reviews', async (req, res) => {
            const result = await reviewCollection.find().toArray();
            res.send(result);
        })


        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('StudySync is Working')
})

app.listen(port, () => {
    console.log(`StudySync is working on port ${port}`);
})