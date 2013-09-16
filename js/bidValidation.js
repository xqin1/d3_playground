//mockup,
var simpleValidation = true;
var numOfFiles = 0;
var response = {"bid":{"passValidation":1, "errorMes":""},
                "bidder":{"passValidation":1, "errorMes":""},
                "price":{"passValidation":1, "errorMes":""}
                };
var regions = ["01", "02", "03","04","05", "06","07","08","09","10","11","12","13","14"];


var reader_bid = new FileReader();
  var reader_bidder = new FileReader();
  var reader_price = new FileReader();
  var biddata,bidderdata,pricedata;
  reader_bid.onload = function(e) {
    var contents = e.target.result;
   biddata = d3.csv.parse(contents);
      validateFileFormat(biddata, "bid");
  };
  reader_bidder.onload = function(e) {
    var contents = e.target.result;
   bidderdata = d3.csv.parse(contents);
   validateFileFormat(bidderdata,"bidder");
  };
    reader_price.onload = function(e) {
    var contents = e.target.result;
   pricedata = d3.csv.parse(contents);
      validateFileFormat(pricedata,"price");
  };
  
  var uploader_bid = document.getElementById("uploader_bid");  
  uploader_bid.addEventListener("change", handleBid, false);  
    var uploader_bidder = document.getElementById("uploader_bidder");  
  uploader_bidder.addEventListener("change", handleBidder, false); 
    var uploader_price = document.getElementById("uploader_price");  
  uploader_price.addEventListener("change", handlePrice, false);   
  
  function handleBid() {
    var file = this.files[0];
      reader_bid.readAsText(file);  
  };
    function handleBidder() {
    var file = this.files[0];
      reader_bidder.readAsText(file);  
  };
  function handlePrice() {
    var file = this.files[0];
      reader_price.readAsText(file);  
  };

//check 1: no null or blank cell
  function validateFileFormat(d,type){
    response[type].passValidation=1;
    response[type].errorMes=[];
      if (typeof d == "undefined"){
        response[type].passValidation =0;
        response[type].errorMes =  type + " data file is not in correct csv format";
      }
      else{
        var colKeys = d3.keys(d[0]);
          d.forEach(function(d){
            // if(d.bidder_name == "undefined" || d.id =="undefined" || d.bid_amount == "undefined"){
            //   response.passValidation =0;
            //   response.errorMes.push("bid data can not be null or blank");
            // }else{
            //      d.bid_amount = +d.amount;         
            // }
            colKeys.forEach(function(k){
              if (typeof(d[k]) == "undefined" || d[k].trim().length==0){
                      response[type].passValidation =0;
                     response[type].errorMes =  type + " data can not be null or blank";
              }
              else{
                if (k != "bidder_name" && k != "id"){
                    d[k] = +d[k];
                    if (type == "bid"){
                      d.bidder_name_id = d.bidder_name + d.id;
                    }
                }
              }
            })
            
          })       
      }
//pass format check
      if (checkValidationStatus){
        if (type == "bid"){
          validateBidAll();
        }
      }

      return checkValidationStatus();
}

  function validateBidAll(){
    //for IC, only one column can has one
    var icData = biddata.filter(function(d){return d.bidder_name == "IC"});
    icData.forEach(function(d){
        d.icBidSum = 0;
        regions.forEach(function(r){
            var t = d[r + "_A"] + d[r + "_B_C(2)"] + d[r + "_D_E(2)"] + d[r + "_C1_C2(2)"];
            d.icBidSum += t;
        })
        if (d.icBidSum != 1){
          response.bid.passValidation = 0;
          response.bid.errorMes = "The total number of bids for IC must be 1"
        }
    })

    //check bidder name and id combintion is unique
    var nameidArray = [];
    biddata.forEach(function(d){
      nameidArray.push(d.bidder_name_id)
    });
    var uniqNameID = d3.set(nameidArray).values().length;
    if (biddata.length != uniqNameID){
          response.bid.passValidation = 0;
          response.bid.errorMes = "The combination of bidder name and id must be unique";
    }

    //check bid number is equal or less than bidding items
    biddata.forEach(function(d){
        regions.forEach(function(r){
            if (d[r + "_A"]< 0 || d[r + "_A"]>1 
              || d[r + "_B_C(2)"] <0 || d[r + "_B_C(2)"] >2 
                ||d[r + "_D_E(2)"]<0 || d[r + "_D_E(2)"]>2 
                  || d[r + "_C1_C2(2)"]<0|| d[r + "_C1_C2(2)"]>2)
            {
                   response.bid.passValidation = 0;
                   response.bid.errorMes = "The number of bid can not exceeds the number of available items";
            }           
        })
    })

    //check bidder bid is sequential
    var clockData = biddata.filter(function(d){
      return +d.id < 10000;
    })
    var groupByBidder = d3.nest()
        .key(function(d){
              return d.bidder_name;})
        .entries(clockData);
    
    groupByBidder.forEach(function(d){
      var gLength = d.values.length;
      var bidNumber = [];
      d.values.forEach(function(d){bidNumber.push(+d.id)});
     // var maxRound = d3.max(d.values, function(v){return +v.id });
     // var minRound = d3.min(d.values, function(v){return +v.id });
     for (var i =0; i<gLength-1;i++){
        if (bidNumber[i] != (bidNumber[i+1] - 1)){
            response.bid.passValidation = 0;
            response.bid.errorMes = "The bids for each bidder musht be sequential";
        }
      }
    })

  }

  function checkValidationStatus(){
    if (response.bid.passValidation == 1 && response.bidder.passValidation ==1 && response.price.passValidation ==1){
      alert("pass validation");
      return true;
    }else{
      alert(JSON.stringify(response));
      return false;
    }
  }
