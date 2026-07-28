const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

async function uploadToS3(buffer, key, contentType) {
    const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: contentType
    };

    await s3.send(new PutObjectCommand(params));
    return `${process.env.CLOUDFRONT_URL}/${key}`;
}

async function deleteFromS3(key) {
    const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key
    };

    await s3.send(new DeleteObjectCommand(params));
}

module.exports = { s3, uploadToS3, deleteFromS3 };
