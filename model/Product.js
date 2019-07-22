var mongoose = require('mongoose');
var mongoosastic = require('mongoosastic');
var Schema = mongoose.Schema;

var ProductSchema = new Schema({
    category: {
        type: Schema.Types.ObjectId,
        ref: 'Category'
    },
    name: String,
    price: Number,
    image: String
});

ProductSchema.plugin(mongoosastic, {
    hosts: [
        'https://y00lrhqp28:z5ijjdbdz0@ecommerce-5181117139.ap-southeast-2.bonsaisearch.net:443'
    ]
});

module.exports = mongoose.model('Product', ProductSchema);