const fs = require('fs');
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');

const uri = 'mongodb://localhost:27017';
const folderPath = 'G:/Xmax/14_05_2025___Project Requiments/Project mau summer 2025/Shopii/Shopii/db';

// Hàm chuyển đổi $oid và $date thành ObjectId và Date
function normalizeExtendedJSON(doc) {
    for (const key in doc) {
        const value = doc[key];

        if (value && typeof value === 'object') {
            if ('$oid' in value) {
                doc[key] = new ObjectId(value.$oid);
            } else if ('$date' in value) {
                doc[key] = new Date(value.$date);
            } else {
                doc[key] = normalizeExtendedJSON(value); // đệ quy cho object lồng
            }
        }
    }
    return doc;
}

async function importAllJSONFiles() {
    const client = new MongoClient(uri);
    try {
        await client.connect();

        const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.json'));

        for (const file of files) {
            const filePath = path.join(folderPath, file);
            const content = fs.readFileSync(filePath, 'utf-8');

            let jsonData;
            try {
                jsonData = JSON.parse(content);
            } catch (err) {
                console.error(`❌ Lỗi JSON ở file ${file}:`, err.message);
                continue;
            }

            const [dbName, collectionName] = file.replace('.json', '').split('.');
            if (!dbName || !collectionName) {
                console.warn(`⚠️ Bỏ qua file không đúng định dạng: ${file}`);
                continue;
            }

            const db = client.db(dbName);
            const collection = db.collection(collectionName);

            if (Array.isArray(jsonData)) {
                const normalized = jsonData
                    .map(normalizeExtendedJSON)
                    .filter(doc => doc && Object.keys(doc).length > 0);

                if (normalized.length > 0) {
                    await collection.insertMany(normalized);
                    console.log(`✅ Đã import ${file} vào ${dbName}.${collectionName}`);
                } else {
                    console.warn(`⚠️ Bỏ qua ${file} vì mảng dữ liệu trống hoặc không hợp lệ`);
                }
            } else {
                const normalized = normalizeExtendedJSON(jsonData);
                await collection.insertOne(normalized);
            }

            console.log(`✅ Đã import ${file} vào ${dbName}.${collectionName}`);
        }

        console.log('🎉 Hoàn tất import tất cả file!');
    } catch (err) {
        console.error('❌ Lỗi kết nối hoặc import:', err);
    } finally {
        await client.close();
    }
}

importAllJSONFiles();