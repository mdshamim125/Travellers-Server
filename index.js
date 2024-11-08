const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const port = process.env.PORT || 9000;
const app = express();

// const corsOptions = {
//   origin: [
//     "http://localhost:5173",
//     "http://localhost:5174",
//     "https://travel-blog-cf01e.web.app",
//     "https://travel-blog-cf01e.firebaseapp.com",
//   ],
//   credentials: true,
//   optionSuccessStatus: 200,
// };
// app.use(cors(corsOptions));

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://travel-blog-cf01e.web.app",
      "https://travel-blog-cf01e.firebaseapp.com",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// verify jwt middleware
const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) return res.status(401).send({ message: "unauthorized access" });
  if (token) {
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) {
        console.log(err);
        return res.status(401).send({ message: "unauthorized access" });
      }
      console.log(decoded);

      req.user = decoded;
      next();
    });
  }
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.s1le0vj.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const blogs = client.db("Blog-Post").collection("traveling");
    const wishList = client.db("Blog-Post").collection("wish-list");
    const comment = client.db("Blog-Post").collection("comments");

    // jwt generate
    app.post("/jwt", async (req, res) => {
      const email = req.body;
      const token = jwt.sign(email, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "365d",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    // Clear token on logout
    // app.post("/logout", (req, res) => {
    //   const user = req.body;
    //   console.log("logging out", user);
    //   res
    //     .clearCookie("token", {
    //       httpOnly: true,
    //       secure: process.env.NODE_ENV === "production",
    //       sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    //       maxAge: 0,
    //     })
    //     .send({ success: true });
    // });

    // Clear token on logout
    app.post("/logout", (req, res) => {
      const user = req.body;
      console.log("logging out", user);
      res
        .clearCookie("token", { maxAge: 0, sameSite: "none", secure: true })
        .send({ success: true });
    });

    // Get blogs data from db
    // app.get("/recent-blogs", async (req, res) => {
    //   const result = await blogs.find().toArray();

    //   res.send(result);
    // });

    // Get recent blogs data from the database
    app.get("/recent-blogs", async (req, res) => {
      const limit = parseInt(req.query.limit) || 6;
      const result = await blogs
        .find()
        .sort({ createdAt: -1 }) // Sort by createdAt in descending order
        .limit(limit)
        .toArray();

      res.send(result);
    });

    // Get all blogs data from db for filtering & searching
    app.get("/all-blogs", async (req, res) => {
      const filter = req.query.filter;
      const search = req.query.search;
      console.log(filter, search);
      let query = {
        title: { $regex: search, $options: "i" },
      };
      if (filter) query.category = filter;
      let options = {};
      const result = await blogs.find(query, options).toArray();

      res.send(result);
    });

    // get my blogs by email from db
    app.get("/my-blogs/:email", async (req, res) => {
      const user = req.params.email;
      // console.log(user);
      const query = { email: user };
      const result = await blogs.find(query).toArray();
      // console.log(result);
      res.send(result);
    });

    // get featured-blogs from traveling db
    app.get("/featured-blogs", async (req, res) => {
      const user = req.params.email;
      // console.log(user);
      const query = { email: user };
      const result = await blogs.find(query).toArray();
      // console.log(result);
      res.send(result);
    });

    // Get a single blog data from db using blog id
    app.get("/blog/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await blogs.findOne(query);
      res.send(result);
    });

    // update a blog
    app.put("/blog/:id", async (req, res) => {
      const id = req.params.id;
      const blogData = req.body;
      const query = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          ...blogData,
        },
      };
      const result = await blogs.updateOne(query, updateDoc, options);
      res.send(result);
    });

    // add a blog data in database
    app.post("/blogs", async (req, res) => {
      const blogData = req.body;
      // console.log(blogData);
      const result = await blogs.insertOne(blogData);
      res.send(result);
    });

    // app.post("/blogs", async (req, res) => {
    //   try {
    //     const blogData = req.body;

    //     // Check if req.body contains the expected fields
    //     console.log("Blog data received:", blogData);

    //     const blogWithTimestamp = {
    //       ...blogData,
    //       createdAt: new Date(Date.now()), // Adds current date/time
    //     };

    //     // console.log("Blog data with timestamp:", blogWithTimestamp); // Log the final data

    //     const result = await blogs.insertOne(blogWithTimestamp);

    //     res.send(result);
    //   } catch (error) {
    //     console.error("Error adding blog data:", error);
    //     res.status(500).send({ error: "Failed to add blog data" });
    //   }
    // });

    //add blog data in wish-list
    app.post("/wish-list", async (req, res) => {
      const blogData = req.body;
      // console.log(blogData);
      const existingEntry = await wishList.findOne({
        email: blogData.email,
        blogId: blogData.blogId,
      });
      if (existingEntry) {
        return res.send({
          message: "Blog data already exists in the wish-list",
        });
      }
      const result = await wishList.insertOne(blogData);
      res.send(result);
    });

    // get blog data from wish-list for specific user
    app.get("/wish-list/:email", async (req, res) => {
      const user = req.params.email;
      const query = { email: user };
      const result = await wishList.find(query).toArray();
      res.send(result);
    });

    // delete blog from wish-list for specific user
    app.delete("/wish-list/:email/:blogId", async (req, res) => {
      const { email, blogId } = req.params;
      const result = await wishList.deleteOne({ email, blogId });
      res.send(result);
    });

    // users comments in comment db
    app.post("/comments", async (req, res) => {
      const commentData = req.body;
      console.log(commentData);
      const result = await comment.insertOne(commentData);
      res.send(result);
    });

    // get comment data from db for specific blog
    app.get("/comments/:blogId", async (req, res) => {
      const blog = req.params.blogId;
      const query = { blogId: blog };
      const result = await comment.find(query).toArray();
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

run().catch(console.dir);
app.get("/", (req, res) => {
  res.send("Hello from Traveling Blog Server....");
});

app.listen(port, () => console.log(`Server running on port ${port}`));
