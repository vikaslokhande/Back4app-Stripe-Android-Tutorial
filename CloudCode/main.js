var Stripe = require("stripe")(
 "sk_test_4jcgz5swf2BvRSDYLe63PNWV
"
);

Parse.Cloud.define("purchaseItem", function(request, response) {
  var item, order;
  Parse.Promise.as().then(function() {

    var itemQuery = new Parse.Query('Item');
    itemQuery.equalTo('ItemName', request.params.itemName);
    return itemQuery.first(null,{useMasterKey: true}).then(null, function(error) {
      return Parse.Promise.error('Sorry, this item is no longer available.');
    });

  },{useMasterKey: true}).then(function(result) {
    if (!result) {
      return Parse.Promise.error('Sorry, this item is no longer available.');
    } else if (result.get('quantityAvailable') <= 0) { 
      return Parse.Promise.error('Sorry, this item is out of stock.');
    }
    item = result;
    item.increment('quantityAvailable', -1);
    return item.save(null,{useMasterKey: true}).then(null, function(error) {
      console.log('Decrementing quantity failed. Error: ' + error);
      return Parse.Promise.error('An error has occurred. Your credit card was not charged.');
    });

  },{useMasterKey: true}).then(function(result) {
    if (item.get('quantityAvailable') < 0) { // can be 0 if we took the last
      return Parse.Promise.error('Sorry, this item is out of stock.');}
  	order = new Parse.Object("Order");
  	order.set('name', "Dominic Wong"); //You can pass the client data from request.params at the begining
    order.set('email', "dominwong4@gmail.com");
    order.set('address', "NA");
    order.set('zip', "99999");
    order.set('city_state', "CA");
    order.set('item', item.get('ItemName'));
    order.set('fulfilled', false);
    order.set('charged', false);
	return order.save(null,{useMasterKey:true}).then(null, function(error) {
      return Parse.Promise.error('An error has occurred. Your credit card was not charged.');
    });

  },{useMasterKey:true}).then(function(order) {
	return Stripe.charges.create({
	  amount: item.get('price')*100, // It needs to convert to cents
	  currency: "usd",
	  source: request.params.cardToken,
	  description: "Charge for dominwong4@gmail.com"
	}, function(err, charge) {
	  // asynchronously called
	  console.log(charge.id);
	});

  },{useMasterKey:true}).then(function(purchase) {
    order.set('stripePaymentId', purchase.id);
    order.set('charged', true);
    order.save(null,{useMasterKey:true});
  },{useMasterKey:true}).then(function() {
  	console.log('mail session '+order.id);
  	//your email logic
  },{useMasterKey:true}).then(function() {
    response.success('Success');
  }, function(error) {
    response.error(error);
  });
});




