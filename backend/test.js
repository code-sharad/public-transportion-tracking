const { MongoClient } = require("mongodb");

const uri =
  "mongodb://admin:admin123@localhost:27017/public_transport_tracker?authSource=admin";
const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    const db = client.db("public_transport_tracker");
    const vehicles = await db.collection("vehicles").find({}).toArray();
    console.log("Vehicles:", vehicles);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.close();
  }
}

run();
