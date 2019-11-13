var stream = ["WebUI-IIS"];
var loggroup = ""
function readTextFile(file, callback) {
	var rawFile = new XMLHttpRequest();
	rawFile.overrideMimeType("application/json");
	rawFile.open("GET", file, true);
	rawFile.onreadystatechange = function(){
	callback(rawFile.responseText);
	}
}
$(document).ready(function ()
{
	readTextFile("config.json", function(text){
		console.log("Inhre")
	});
	homepage();
});

//Render the homepage to the maindisplay container
function homepage()
{
	$("#maindisplay").html('<div class="container"><header class="jumbotron my-4"><h1 class="display-3">Welcome to Tools!</h1><p class="lead">Select an option from below to run tool</p></header><div class="row text-center"><div class="col-lg-3 col-md-6 mb-4"><div class="card h-100"><img class="card-img-top" src="log-512.png" alt="" width="100" height="250"><div class="card-body"><h4 class="card-title">AWS Logs</h4><p class="card-text">Fetch logs from AWS Cloudwatch</p></div><div class="card-footer"><a class="btn btn-primary" id="fetch">Fetch Logs!</a></div></div></div><div class="col-lg-3 col-md-6 mb-4"><div class="card h-100"><img class="card-img-top" src="test.png" alt="" width="100" height="250"><div class="card-body"><h4 class="card-title">WOC Automation</h4><p class="card-text">Automation Script to check WOC Portal Sanity</p></div><div class="card-footer"><a class="btn btn-primary" id="run">Run Automation!</a></div></div></div></div>')
}

//Ask user for logstreams and timestamp
$(document).on('click', '#fetch', function ()
{
	var myParent = document.getElementById("maindisplay")
	var streams = ["WebUI-IIS", "ServicesLogs", "WebUI-WinEvents", "Services-WinEvents"];
	$("#maindisplay").html('<div><br><div class="alert alert-success" role="alert">Please select log streams and Time Stamps to fetch logs</div></div>');
	var selectList = document.createElement("select");
	selectList.id = "mySelect";
	myParent.appendChild(selectList);

	//Create and append the options
	for (var i = 0; i < streams.length; i++) {
		var option = document.createElement("option");
		option.value = streams[i];
		option.text = streams[i];
		selectList.appendChild(option);
	}
	$('#mySelect').multiSelect({
		afterSelect: function(values){
			console.log(values[0])
			stream.push(values[0])
		},
		afterDeselect: function(values){
			var index = stream.indexOf(values[0]);
			if(index > -1){
				console.log(values[0])
				stream.splice(index, 1);
			}
		}
	});
	$("#maindisplay").append('<br><div class="centered"<form class="sky-form"><fieldset> <div class="row"><section class="col col-6"><label for="startTime">Choose a start time:</label><input type="datetime-local" id="startTime" class="form-control" required="true" style="width:260px"></input></section></div></fieldset></form><br><form class="sky-form"><fieldset> <div class="row"><section class="col col-6"><label for="endTime">Choose an end time:</label><input type="datetime-local" id="endTime" class="form-control" required="true" style="width:260px" placeholder="Choose an end time"></inpput></section></div></fieldset></form></div><br><button id="fetch1" type="submit" class="btn btn-primary">Fetch Logs</button>')
}); 

// Ajax request to fetch logs from python backend
$(document).on('click', '#fetch1', function ()
{
	var senddata = {};
	var start = document.getElementById('startTime').value
	var end = document.getElementById('endTime').value
	senddata.log_group = "fulcrum-prov";
	console.log(start.length, end.length)
	senddata.streams = stream//["WebUI-IIS", "ServicesLogs"];
	senddata.startTime = start;
	senddata.endTime = end;
    if(start.length != 0 && end.length != 0){
		makerequest("POST","http://localhost:5000/fetchlogs", senddata)      
	}
	else{
		$("#maindisplay").append('<br><br><div class="alert alert-danger" role="alert">Please enter complete timestamps</div>')
	}
}); 

$(document).on('click', '#run', function ()
{
    makerequest("GET", "http://localhost:5000/runtest", {})      
}); 

$(document).on('click', '#home', function ()
{
    homepage()      
}); 


function makerequest(type_, url_, data_)
{
    $("#maindisplay").html('<br><div class="d-flex align-items-center"><strong>Loading...</strong><div class="spinner-border ml-auto" role="status" aria-hidden="true"></div></div>')
    $.ajax({
		type: type_,
		url: url_,
		data: JSON.stringify(data_),
		dataType: "json",
		timeout: 240000,
		error: function (jqXHR, testStatus, errorThrown) {
			if (testStatus == "timeout") {
				$("#maindisplay").html("<br><div class='alert alert-danger fade in'>Request Timeout. Please try again!</div>")
			} else {
				$("#maindisplay").html('<br><div class="alert alert-danger" role="alert">Internal Server Error!</div>')
			}
		},
		success: function (json) {
			var empties = 0;
			var finaljson = [];
            for(var logname in json){
				var streamkeys = Object.keys(json[logname]).length
				for(var stream in json[logname]){
					if(json[logname][stream].length == 0){
						empties = empties + 1;
					}
					else{
						for(var element = 0; element < json[logname][stream].length; element++){
							var tempjson = {};
							tempjson["LogGroupName"] = logname;
							tempjson["StreamName"] = stream;
							for(var columname in json[logname][stream][element]){
								if(columname != 'eventId'){
									tempjson[columname] = json[logname][stream][element][columname];
								}
							}
							finaljson.push(tempjson)
						}
					}  
				}    
			}
			if(empties == streamkeys)
			{
				$("#maindisplay").html('<div><br><div class="alert alert-success" role="alert">No logs exist for the given timestamps!</div></div>')
			}
			else{
				$("#maindisplay").html('<div><br><div class="alert alert-success" role="alert">Please find results below</div><table id="jsonTable"class="display"></table></div>');
				drawTable(finaljson, "jsonTable");
			}
		}
	});    
}


function drawTable(jsondata, tableId) {
	var cols = [];
	var lengtharray = jsondata.map(function (v) {
		return Object.keys(v).length;
	});
	var maxlengthobject = Math.max.apply(null, lengtharray);
	var index = lengtharray.indexOf(maxlengthobject);
	var exampleRecord = jsondata[index];
	var keys = Object.keys(exampleRecord);
	keys.forEach(function (k) {
		cols.push({
			title: k,
			data: k
		});
	});

	$.fn.dataTable.ext.errMode = 'none';
	var table = $('#' + tableId).DataTable({
		"destroy": true,
		dom: 'Blfrtip',
		columns: cols,
		"pageLength": 10,
		"lengthMenu": [
			[10, 50, 100, 500, -1],
			[10, 50, 100, 500, "All"]
		],
		buttons:[
			'csv', 'pdf'
		]		
	});

	table.rows.add(jsondata).draw();
}