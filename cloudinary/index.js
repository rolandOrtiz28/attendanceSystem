const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');


cloudinary.config({
  cloud_name: 'dalfz3t49',
  api_key: '333337243589348',
  api_secret: '-uqK2puwH-mqXuMBk9l4WhiEFMo'
});

const storage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: 'WFS',
        allowed_formats: ['jpeg', 'png', 'jpg'],
        quality: 80,
        maxFileSize: 100000000
    },

})







module.exports = {
    cloudinary,
    storage
}