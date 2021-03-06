// We're using this BLE plugin that's also available in the PhoneGap Developer App:
// https://github.com/don/cordova-plugin-ble-central

// Service/Characteristics for BME-Sensor.
var ENV_SERVICE	       	= "181a";
var ENV_TEMP			= "2a6e";
var ENV_HUM				= "2a6f";
var ENV_PRESS			= "2a6d";

// Service/Characteristics for MICS-Sensor.
var GAS_SERVICE   		= "4b822f90-3941-4a4b-a3cc-b2602ffe0d00";
var GAS_CO_RAW			= "4b822fa1-3941-4a4b-a3cc-b2602ffe0d00";
var GAS_CO_CALIB		= "4b822fa2-3941-4a4b-a3cc-b2602ffe0d00";
var GAS_NO2_RAW			= "4b822f91-3941-4a4b-a3cc-b2602ffe0d00";
var GAS_NO2_CALIB		= "4b822f92-3941-4a4b-a3cc-b2602ffe0d00";
var GAS_NH3_RAW			= "4b822fb1-3941-4a4b-a3cc-b2602ffe0d00";
var GAS_NH3_CALIB		= "4b822fb2-3941-4a4b-a3cc-b2602ffe0d00";

// Start listening for deviceready event.
document.addEventListener('deviceready', onDeviceReady, false);

var activeSensor;
var connectedDevice;
var scanTimeout;
var connected = false;

var cTemp;
var cPress;
var cHumid;

var bTemp;
var bPress;
var bHumid;
// var bDone = false;

function onDeviceReady() { }

// When scan button is clicked, check if BLE is enabled and available, then start BLE scan.
function startBLEScan() {
	ble.isEnabled(bleEnabled, bleDisabled);
}

// Show message when BLE is disabled or not available.
function bleDisabled() {
	new $.nd2Toast({message : "Enable Bluetooth first."});
}

// BLE is enabled, start scan for 10 seconds.
function bleEnabled() {
	// Show message.
	new $.nd2Toast({message : "Started 10 second scan."});
	 
	// Start scan with "device found"-callback.
	ble.scan([], 10, function(device) {
		addDev(device);
	}, function() {
		new $.nd2Toast({message : "Scan failed."});
	});
	
	// Disable scan button and remove list entries from previous scan.
	$("#scanButton").switchClass("ui-enabled", "ui-disabled");
	$(".deviceItem").hide('slow', function() { $(this).remove(); });
	$(".deviceItemEnv").hide('slow', function() { $(this).remove(); });
	
	// If device was not found after 10 seconds, stop scan.
	scanTimeout = setTimeout(stopBLEScan, 10000);
}

// "Device found" callback.
function addDev(device) {
	// Copy insivible list entry template.
	var newDiv = $("#deviceItem").clone();
	
	// Check if found device is Teco_Env environment sensor.
	if (device.name.toUpperCase() === "TECO_ENV") {
		
		// Add to list and add RSSI.
		newDiv.attr("id","whatever") 
		.appendTo("#deviceList")
		.switchClass("deviceItemTemplate", "deviceItemEnv")
		.find("#deviceRSSI").html("RSSI: " + device.rssi + " dB");
		
		// Set onClick listener. When device is not yet connected, clicking starts connect call.
		newDiv.click(function() {
			clearTimeout(scanTimeout)
			
			if (!connected) {
				// Stop scan before connecting.
				ble.stopScan(stopSuccess, stopFailure);
				// Remove all other list items.
				$(".deviceItem").hide("slow", function() { $(this).remove(); });
				newDiv.find("#deviceInfo").html("Connecting...");
				
				// For easy access.
				activeSensor = newDiv;
				
				// Disable scan button and connect.
				$("#scanButton").switchClass("ui-enabled", "ui-disabled");
				ble.connect(device.id, connectSuccess, connectFailure);
				connected = true;
				
			} else {
			
				// Clicking when connected: start disconnect.
				ble.disconnect(device.id, connectFailure, connectFailure);
				connected = false;
			}
		});
		
		newDiv.show();

	} else {
	
		// If device is not a TECO Environment Sensor, set info accordingly. No onClick.
		newDiv.attr("id","whatever") 
		.appendTo("#deviceList")
		.switchClass("deviceItemTemplate", "deviceItem")
		.find("#deviceRSSI").html("RSSI: " + device.rssi + " dB");
		newDiv.find("#deviceInfo").html("Unknown device, cannot connect.")
		newDiv.find("#deviceName").html("Device: " + device.name)
		newDiv.find("#deviceImg").attr('src','img/unknown.jpg');
		newDiv.show();		
	}
}

function stopSuccess(){ }

function stopFailure(){ }

// Callback for finished BLE scan. Enable scan burron.
function stopBLEScan(){
	$("#scanButton").switchClass("ui-disabled", "ui-enabled");
	new $.nd2Toast({message : "Scan finished."});
}

// Connection failed or connection lost. Show message accordingly.
function connectFailure(peripheral) {
	new $.nd2Toast({message : "Disconnected"});
	
	// Enable scan button and empty list.
	$("#scanButton").switchClass("ui-disabled", "ui-enabled");	
	$(".deviceItem").hide('slow', function() { $(this).remove(); });
	$(".deviceItemEnv").hide('slow', function() { $(this).remove(); });
	connected = false;
}

// Callback for established connection.
function connectSuccess(peripheral) {
	// Print all device info to debug.
	console.log(JSON.stringify(peripheral));
	
	activeSensor.find("#deviceInfo").html("Connected!")
	connectedDevice = peripheral;
	
	// Start notifications for temperature, humidity and pressure.	
	ble.startNotification(connectedDevice.id, ENV_SERVICE, ENV_TEMP, notifyTEMP, notificationFailure);	
	ble.startNotification(connectedDevice.id, ENV_SERVICE, ENV_HUM, notifyHUM, notificationFailure);	
	ble.startNotification(connectedDevice.id, ENV_SERVICE, ENV_PRESS, notifyPRESS, notificationFailure);	
	

}

// Callback when notification request fails.
function notificationFailure(reason) {
	new $.nd2Toast({message : "CNotification request failed."});
}

// Three callbacks, they get called when a notification is received.
function notifyTEMP(buffer) {
	var value = new Int16Array(buffer);
	var floatVal = value[0] / 100.0;
	activeSensor.find("#deviceInfo").html("Temperature: " + floatVal + "°C");
	cTemp = floatVal;
	bTemp = true;
	
	// if (bTemp && bHumid && bPress && (!bDone)){
		// bDone = true;
		// getTemp();
	// }
}

function notifyHUM(buffer) {
	var value = new Uint16Array(buffer);
	var floatVal = value[0] / 100.0;
	activeSensor.find("#deviceInfo2").html("Humidity: " + floatVal + "%");
	cHumid = floatVal;
	bHumid = true;
	
	// if (bTemp && bHumid && bPress && (!bDone)){
		// bDone = true;
		// getTemp();
	// }

}

function notifyPRESS(buffer) {
	var value = new Uint32Array(buffer);
	var floatVal = value[0] / 10.0;
	floatVal = floatVal /101325;
	floatVal = floatVal.toFixed(5);
	activeSensor.find("#deviceInfo3").html("Pressure: " + floatVal + " atm");
	cPress = floatVal;
	bPress = true;

	// if (bTemp && bHumid && bPress && (!bDone)){
		// bDone = true;
		// getTemp();
	// }

}

var api_url1;
var api_url2;

var city1 = 'new york,usa';
var cityName1;
var tempr1;
var press1;
var humid1;
var city2 = 'hyderabad,india';
var cityName2;
var tempr2;
var press2;
var humid2;

var country1;
var country2;
var start;

var finish1 = false;
var finish2 = false;

var cityList = "Kabul,Afghanistan;Tirana,Albania;Algiers,Algeria;Djelfa,Algeria;Andorra+la+Vella,Andorra;Huambo,Angola;Luanda,Angola;St.+John's,Antigua+and+Barbuda;Buenos+Aires,Argentina;La+Plata,Argentina;Mar+del+Plata,Argentina;San+Miguel+de+Tucuman,Argentina;Yerevan,Armenia;Adelaide,Australia;Brisbane,Australia;Canberra,Australia;Melbourne,Australia;Perth,Australia;Sydney,Australia;Vienna,Austria;Baku,Azerbaijan;Ganja,Azerbaijan;Nassau,Bahamas;Manama,Bahrain;Dhaka,Bangladesh;Khulna,Bangladesh;Bridgetown,Barbados;Gomel,Belarus;Minsk,Belarus;Antwerp,Belgium;Brussels,Belgium;Belmopan,Belize;Porto+Novo,Benin;Thimphu,Bhutan;El+Alto,Bolivia;La+Paz,Bolivia;Santa+Cruz,Bolivia;Sucre,Bolivia;Sarajevo,Bosnia+and+Herzegovina;Gaborone,Botswana;Belem,Brazil;Belo+Horizonte,Brazil;Brasilia,Brazil;Campinas,Brazil;Curitiba,Brazil;Fortaleza,Brazil;Goiania,Brazil;Guarulhos,Brazil;Maceio,Brazil;Manaus,Brazil;Osasco,Brazil;Porto+Alegre,Brazil;Recife,Brazil;Ribeirao+Preto,Brazil;Rio+de+Janeiro,Brazil;Santo+Andre,Brazil;Sao+Jose+dos+Campos,Brazil;Sao+Luis,Brazil;Sao+Paulo,Brazil;Sorocaba,Brazil;Uberlandia,Brazil;Bandar+Seri+Begawan,Brunei;Sofia,Bulgaria;Ouagadougou,Burkina+Faso;Bujumbura,Burundi;Phnom+Penh,Cambodia;Douala,Cameroon;Yaounde,Cameroon;Calgary,Canada;Edmonton,Canada;Hamilton,Canada;Mississauga,Canada;Montreal,Canada;Ottawa,Canada;Toronto,Canada;Vancouver,Canada;Winnipeg,Canada;Praia,Cape+Verde;George+Town,Cayman+Islands;Bangui,Central+African+Republic;N'Djamena,Chad;Santiago,Chile;Bogota,Colombia;Cali,Colombia;Moroni,Comoros;San+Jose,Costa+Rica;Zagreb,Croatia;Havana,Cuba;Nicosia,Cyprus;Prague,Czech+Republic;Kinshasa,Democratic+Republic+of+the+Congo;Lubumbashi,Democratic+Republic+of+the+Congo;Copenhagen,Denmark;Djibouti,Djibouti;Roseau,Dominica;Santiago+de+los+Caballeros,Dominican+Republic;Santo+Domingo,Dominican+Republic;Dili,East+Timor;Guayaquil,Ecuador;Quito,Ecuador;Quito,Ecuador;Alexandria,Egypt;Cairo,Egypt;Giza,Egypt;Helwan,Egypt;Port+Said,Egypt;Shubra+El-Kheima,Egypt;San+Salvador,El+Salvador;Malabo,Equatorial+Guinea;Asmara,Eritrea;Tallinn,Estonia;Addis+Ababa,Ethiopia;Suva,Fiji;Helsinki,Finland;Marseille,France;Paris,France;Cayenne,French+Guiana;Libreville,Gabon;Tbilisi,Georgia;Berlin,Germany;Bremen,Germany;Cologne,Germany;Dortmund,Germany;Dresden,Germany;Dusseldorf,Germany;Essen,Germany;Frankfurt,Germany;Hamburg,Germany;Hanover,Germany;Leipzig,Germany;Munich,Germany;Nuremberg,Germany;Stuttgart,Germany;Accra,Ghana;Kumasi,Ghana;Sekondi-Takoradi,Ghana;Athens,Greece;Athens,Greece;St+George's,Grenada;Guatemala+City,Guatemala;Conakry,Guinea;Bissau,Guinea-Bissau;Georgetown,Guyana;Carrefour,Haiti;Port-au-Prince,Haiti;Comayaguela,Honduras;San+Pedro+Sula,Honduras;Tegucigalpa,Honduras;Budapest,Hungary;Reykjavik,Iceland;Agartala,India;Agra,India;Ahmedabad,India;Aligarh,India;Aurangabad,India;Bangalore,India;Bareilly,India;Bhiwandi,India;Bhopal,India;Bhubaneswar,India;Bikaner,India;Chandigarh,India;Chennai,India;Coimbatore,India;Delhi,India;Ghaziabad,India;Guntur,India;Gurgaon,India;Hyderabad,India;Indore,India;Jaipur,India;Jalandhar,India;Jammu,India;Jamshedpur,India;Jodhpur,India;Kochi,India;Kolkata,India;Lucknow,India;Madurai,India;Mumbai,India;Mysore,India;New+Delhi,India;Patna,India;Pimpri-Chinchwad,India;Pune,India;Rajkot,India;Ranchi,India;Salem,India;Surat,India;Trichy,India;Ujjain,India;Varanasi,India;Vijayawada,India;Visakhapatnam,India;Balikpapan,Indonesia;Bandarlampung,Indonesia;Bandung,Indonesia;Banjarmasin,Indonesia;Batam,Indonesia;Bekasi,Indonesia;Bogor,Indonesia;Cimahi,Indonesia;Denpasar,Indonesia;Depok,Indonesia;Jakarta,Indonesia;Jambi,Indonesia;Makassar,Indonesia;Malang,Indonesia;Medan,Indonesia;Palembang,Indonesia;Pekanbaru,Indonesia;Pontianak,Indonesia;Samarinda,Indonesia;Semarang,Indonesia;Serang,Indonesia;Surabaya,Indonesia;Surakarta,Indonesia;Tangerang,Indonesia;Tangerang+Selatan,Indonesia;Tasikmalaya,Indonesia;Ahvaz,Iran;Eslamshahr,Iran;Hamadan,Iran;Isfahan,Iran;Karaj,Iran;Kerman,Iran;Kermanshah,Iran;Mashhad,Iran;Qom,Iran;Rasht,Iran;Shiraz,Iran;Tabriz,Iran;Tehran,Iran;Urmia,Iran;Zahedan,Iran;An+Najaf,Iraq;Baghdad,Iraq;Basra,Iraq;Erbil,Iraq;Kirkuk,Iraq;Mosul,Iraq;Dublin,Ireland;Jerusalem,Israel;Genoa,Italy;Milan,Italy;Naples,Italy;Palermo,Italy;Rome,Italy;Turin,Italy;Yamoussoukro,Ivory+Coast;Abidjan,Ivory+Coast;Bouake,Ivory+Coast;Kingston,Jamaica;Chiba,Japan;Fukuoka,Japan;Funabashi,Japan;Hamamatsu,Japan;Himeji,Japan;Hiroshima,Japan;Kagoshima,Japan;Kawaguchi,Japan;Kawasaki,Japan;Kitakyushi,Japan;Kobe,Japan;Kumamoto,Japan;Kyoto,Japan;Matsuyama,Japan;Nagoya,Japan;Niigata,Japan;Okayama,Japan;Osaka,Japan;Sagamihara,Japan;Saitama,Japan;Sakai,Japan;Sapporo,Japan;Sendai,Japan;Shizuoka,Japan;Tokyo,Japan;Utsunomiya,Japan;Yokohama,Japan;Amman,Jordan;Irbid,Jordan;Almaty,Kazakhstan;Astana,Kazakhstan;Karaganda,Kazakhstan;Shymkent,Kazakhstan;Mombasa,Kenya;Nairobi,Kenya;South+Tarawa,Kiribati;Kuwait+City,Kuwait;Bishkek,Kyrgyzstan;Vientiane,Laos;Riga,Latvia;Beirut,Lebanon;Maseru,Lesotho;Monrovia,Liberia;Benghazi,Libya;Tripoli,Libya;Vaduz,Liechtenstein;Vilnius,Lithuania;Luxembourg+City,Luxembourg;Antananarivo,Madagascar;Blantyre,Malawi;Lilongwe,Malawi;Klang,Malaysia;Kuala+Lumpur,Malaysia;Kuantan,Malaysia;Petaling+Jaya,Malaysia;Male,Maldives;Bamako,Mali;Valletta,Malta;Majuro,Marshall+Islands;Nouakchott,Mauritania;Port+Louis,Mauritius;Acapulco,Mexico;Chihuahua,Mexico;Ciudad+Nezahualcoyotl,Mexico;Culiacan,Mexico;Durango,Mexico;Ecatepec+de+Morelos,Mexico;Ensenada,Mexico;Guadalajara,Mexico;Guadalupe,Mexico;Hermosillo,Mexico;Leon,Mexico;Matamoros,Mexico;Mexico+City,Mexico;Monterrey,Mexico;Puebla+City,Mexico;Tlaquepaque,Mexico;Tultitlan+de+Mariano+Escobedo,Mexico;Tuxtla+Gutierrez,Mexico;Zapopan,Mexico;Palikir,Micronesia;Chisinau,Moldova;Monaco,Monaco;Ulaanbaatar,Mongolia;Podgorica,Montenegro;Casablanca,Morocco;Fes,Morocco;Marrakesh,Morocco;Meknes,Morocco;Rabat,Morocco;Maputo,Mozambique;Matola,Mozambique;Mandalay,Myanmar;Naypyidaw,Myanmar;Yangon,Myanmar;Windhoek,Namibia;Yaren,Nauru;Kathmandu,Nepal;Rotterdam,Netherlands;Amsterdam,Netherlands+;Auckland,New+Zealand;Wellington,New+Zealand;Managua,Nicaragua;Niamey,Niger;Abeokuta,Nigeria;Abuja,Nigeria;Abuja,Nigeria;Enugu,Nigeria;Ife,Nigeria;Ilorin,Nigeria;Jos,Nigeria;Kaduna,Nigeria;Lagos,Nigeria;Maiduguri,Nigeria;Ogbomosho,Nigeria;Onitsha,Nigeria;Hamhung,North+Korea;Pyongyang,North+Korea;Oslo,Norway;Muscat,Oman;Faisalabad,Pakistan;Gujranwala,Pakistan;Hyderabad,Pakistan;Islamabad,Pakistan;Karachi,Pakistan;Lahore,Pakistan;Multan,Pakistan;Peshawar,Pakistan;Quetta,Pakistan;Rawalpindi,Pakistan;Sargodha,Pakistan;Sialkot,Pakistan;Koror,Palau;Panama+City,Panama;Port+Moresby,Papua+New+Guinea;Asuncion,Paraguay;Anyang,China;Baoding,China;Beijing,China;Benxi,China;Binzhou,China;Changde,China;Changsha,China;Chongqing,China;Danzhou,China;Daqing,China;Dongguan,China;Foshan,China;Fuzhou,China;Guangzhou,China;Hangzhou,China;Hefei,China;Heihe,China;Huai'an,China;Kaifeng,China;Lanzhou,China;Liuzhou,China;Luoyang,China;Macau,China;Nanjing,China;Nantong,China;Ningbo,China;Putian,China;Qingdao,China;Qiqihar,China;Shanghai,China;Shantou,China;Shaoxing,China;Shenyang,China;Shenzhen,China;Suzhou,China;Taiyuan,China;Tianjin,China;Weifang,China;Wenzhou,China;Wuhan,China;Wuhu,China;Xiamen,China;Yancheng,China;Yichang,China;Zhengzhou,China;Zhongshan,China;Zibo,China;Arequipa,Peru;Chiclayo,Peru;Lima,Peru;Trujillo,Peru;Yurimaguas,Peru;Antipolo,Philippines;Bacolod,Philippines;Bacoor,Philippines;Cagayan+de+Oro,Philippines;Caloocan,Philippines;Cebu+City,Philippines;Dasmarinas,Philippines;Davao+City,Philippines;General+Santos,Philippines;Las+Pinas,Philippines;Makati,Philippines;Manila,Philippines;Muntinlupa,Philippines;Paranaque,Philippines;Pasig,Philippines;Quezon+City,Philippines;San+Jose+del+Monte,Philippines;Taguig,Philippines;Valenzuela,Philippines;Zamboanga+City,Philippines;Krakow,Poland;Lodz,Poland;Poznan,Poland;Warsaw,Poland;Wroclaw,Poland;Lisbon,Portugal;San+Juan,Puerto+Rico;Doha,Qatar;Skopje,Republic+of+Macedonia;Brazzaville,Republic+of+the+Congo;Bucharest,Romania;Astrakhan,Russia;Barnaul,Russia;Chelyabinsk,Russia;Irkutsk,Russia;Izhevsk,Russia;Kazan,Russia;Kemerovo,Russia;Khabarovsk,Russia;Kirov,Russia;Krasnodar,Russia;Krasnoyarsk,Russia;Lipetsk,Russia;Makhachkala,Russia;Moscow,Russia;Naberezhnye+Chelny,Russia;Nizhny+Novgorod,Russia;Novokuznetsk,Russia;Novosibirsk,Russia;Omsk,Russia;Orenburg,Russia;Penza,Russia;Perm,Russia;Rostov-on-Don,Russia;Ryazan,Russia;Saint+Petersburg,Russia;Samara,Russia;Saratov,Russia;Tolyatti,Russia;Tomsk,Russia;Tyumen,Russia;Ufa,Russia;Ulyanovsk,Russia;Vladivostok,Russia;Volgograd,Russia;Voronezh,Russia;Yaroslavl,Russia;Yekaterinburg,Russia;Kigali,Rwanda;Basseterre,Saint+Kitts+and+Nevis;Castries,Saint+Lucia;Kingstown,Saint+Vincent+and+the+Grenadines;Apia,Samoa;San+Marino,San+Marino;Sao+Tome,Sao+Tome;Jeddah,Saudi+Arabia;Mecca,Saudi+Arabia;Riyadh,Saudi+Arabia;Dakar,Senegal;Belgrade,Serbia;Victoria,Seychelles;Freetown,Sierra+Leone;Singapore,Singapore;Bratislava,Slovakia;Ljubljana,Slovenia;Honiara,Solomon+Islands;Mogadishu,Somalia;Hargeisa,Somaliland;Durban,South+Africa;Johannesburg,South+Africa;Pretoria,South+Africa;Bucheon,South+Korea;Busan,South+Korea;Cheongju,South+Korea;Daegu,South+Korea;Goyang,South+Korea;Jeonju,South+Korea;Pohang,South+Korea;Seoul,South+Korea;Yongin,South+Korea;Juba,South+Sudan;Barcelona,Spain;Madrid,Spain;Malaga,Spain;Seville,Spain;Valencia,Spain;Zaragoza,Spain;Colombo,Sri+Lanka;Gaza+City,State+of+Palestine;Khartoum,Sudan;Khartoum+North,Sudan;Omdurman,Sudan;Paramaribo,Suriname;Mbabane,Swaziland;Stockholm,Sweden;Bern,Switzerland;Aleppo,Syria;Damascus,Syria;Homs,Syria;Latakia,Syria;Kaohsiung+City,Taiwan;New+Taipei+City,Taiwan;Taipei,Taiwan;Taoyuan+District,Taiwan;Dushanbe,Tajikistan;Dar+es+Salaam,Tanzania;Dodoma,Tanzania;Bangkok,Thailand;Banjul,The+Gambia;Lome,Togo;Nuku'alofa,Tonga;Port+of+Spain,Trinidad+and+Tobago;Tunis,Tunisia;Adana,Turkey;Ankara,Turkey;Antalya,Turkey;Balikesir,Turkey;Bursa,Turkey;Denizli,Turkey;Gaziantep,Turkey;Istanbul,Turkey;Izmir,Turkey;Kayseri,Turkey;Asgabat,Turkmenistan;Cockburn+Town,Turks+and+Caicos;Funafuti,Tuvalu;Kampala,Uganda;Dnipro,Ukraine;Donetsk,Ukraine;Kharkiv,Ukraine;Kryvyi+Rih,Ukraine;Kiev,Ukraine;Lviv,Ukraine;Odessa,Ukraine;Zaporizhzhya,Ukraine;Abu+Dhabi,United+Arab+Emirates;Al+Ain,United+Arab+Emirates;Dubai,United+Arab+Emirates;Sharjah,United+Arab+Emirates;Birmingham,United+Kingdom;Glasgow,United+Kingdom;Leeds,United+Kingdom;London,United+Kingdom;Manchester,United+Kingdom;Sheffield,United+Kingdom;Albuquerque,United+States+of+America;Austin,United+States+of+America;Baltimore,United+States+of+America;Boston,United+States+of+America;Charlotte,United+States+of+America;Chicago,United+States+of+America;Columbus,United+States+of+America;Dallas,United+States+of+America;Denver,United+States+of+America;Detroit,United+States+of+America;El+Paso,United+States+of+America;Fort+Worth,United+States+of+America;Houston,United+States+of+America;Indianapolis,United+States+of+America;Jacksonville,United+States+of+America;Las+Vegas,United+States+of+America;Los+Angeles,United+States+of+America;Louisville,United+States+of+America;Memphis,United+States+of+America;Milwaukee,United+States+of+America;Nashville,United+States+of+America;New+York+City,United+States+of+America;Oklahoma+City,United+States+of+America;Philadelphia,United+States+of+America;Phoenix,United+States+of+America;Portland,United+States+of+America;San+Antonio,United+States+of+America;San+Diego,United+States+of+America;San+Francisco,United+States+of+America;San+Jose,United+States+of+America;Seattle,United+States+of+America;Tucson,United+States+of+America;Washington,+D.C.,United+States+of+America;Montevideo,Uruguay;Samarkand,Uzbekistan;Tashkent,Uzbekistan;Port+Vila,Vanuatu;Vatican+City,Vatican+City;Barquisimeto,Venezuela;Caracas,Venezuela;Ciudad+Guayana,Venezuela;Maracaibo,Venezuela;Maracay,Venezuela;Valencia,Venezuela;Bien+Hoa,Vietnam;Haiphong,Vietnam;Hanoi,Vietnam;Ho+Chi+Minh+City,Vietnam;La'youn,Western+Sahara;Aden,Yemen;Al+Hudaydah,Yemen;Sana'a,Yemen;Ta'izz,Yemen;Kitwe,Zambia;Lusaka,Zambia;Bulawayo,Zimbabwe;Harare,Zimbabwe";
var arr = cityList.split(';');


function getCities() {
	

	city1 = arr[Math.floor(Math.random() * arr.length)];
	do {
		city2 = arr[Math.floor(Math.random() * arr.length)];
	}
	while (city1 == city2);
	
	
	

	var list1 = city1.split(',');
	var list2 = city2.split(',');
	
	country1 = list1[1];
	country2 = list2[1];
	
	country1 = country1.replace(/\+/g, " ");	
	country2 = country2.replace(/\+/g, " ");
	
	

	
	// $('#result3').text(list1[0] + ',' + country1 + ';' + list2[0] + ',' + country2);
	
}

function getTemp() {


	api_url1 = 'http://api.openweathermap.org/data/2.5/weather?q=' + city1 + '&appid=43bc64a180fd970da3cbd821a49296c5';

	$.ajax({
		url : api_url1,
		method : 'GET',
		success : function (data) {
		

			// cityName1 = data.name + ', ' + data.sys.country;
			cityName1 = data.name + ', ' + country1;
			tempr1 = data.main.temp - 273;
			tempr1 = tempr1.toFixed(2);
			press1 = data.main.pressure / 1013.25;
			press1 = press1.toFixed(5);
			humid1 = data.main.humidity;

				
			// $('#result1').text(cityName1 + ': ' + tempr1 + '°' + ', ' + press1 + 'atm' + ', ' + humid1 + '%');
			$('#result1').text('Random City 1: ' + cityName1);
	
		}
	})
	.done(function (data) {
		getGraph();
	})
	;
	
	
	api_url2 = 'http://api.openweathermap.org/data/2.5/weather?q=' + city2 + '&appid=43bc64a180fd970da3cbd821a49296c5';

	$.ajax({
		url : api_url2,
		method : 'GET',
		success : function (data) {
		

			// cityName2 = data.name + ', ' + data.sys.country;
			cityName2 = data.name + ', ' + country2;
			tempr2 = data.main.temp - 273;
			tempr2 = tempr2.toFixed(2);
			press2 = data.main.pressure / 1013.25;
			press2 = press2.toFixed(5);
			humid2 = data.main.humidity;
			
			// $('#result2').text(cityName2 + ': ' + tempr2 + '°' + ', ' + press2 + 'atm' + ', ' + humid2 + '%');
			$('#result2').text('Random City 2: ' + cityName2);

			
	
		}
	})
	.done(function (data) {
		getGraph();
	})
	;
	
	start = true;
	
}

setInterval(function(){ 
    if (bTemp & bPress & bHumid & start) {
		getGraph();
	}
	
}, 30000);




function readLines(input, func) {
  var remaining = '';

  input.on('data', function(data) {
    remaining += data;
    var index = remaining.indexOf('\n');
    var last  = 0;
    while (index > -1) {
      var line = remaining.substring(last, index);
      last = index + 1;
      func(line);
      index = remaining.indexOf('\n', last);
    }

    remaining = remaining.substring(last);
  });

  input.on('end', function() {
    if (remaining.length > 0) {
      func(remaining);
    }
  });
}


function getGraph(){

	var cities = ["BLE Sensor",cityName1,cityName2];
	var temps = [parseFloat(cTemp),parseFloat(tempr1),parseFloat(tempr2)];
	var pressures = [parseFloat(cPress),parseFloat(press1),parseFloat(press2)];
	var humids = [parseFloat(cHumid),parseFloat(humid1),parseFloat(humid2)];
	
	// Highcharts.setOptions({
		// plotOptions: {
			// series: {
				// animation: false
			// }
		// }
	// });

	Highcharts.chart('container1', {
		chart: {
			backgroundColor:'#F5F5DC',
			plotBackgroundColor: '#FFFFFF',
			type: 'column'
		},
		title: {
			text: 'Temperature comparison'
			,
			style: {
				fontSize:'18px'
			}
		},

		xAxis: {
			categories: cities,

			title : {
				text: 'Location'
				,
				style: {
					fontSize:'15px'
				}
			},
			crosshair: true
			,
			labels: {
				style: {
					fontSize:'12px'
				}
			}
		},
		yAxis: {
			// min: 0,
			title: {
				text: 'Temperature(°C)'
			}
			,
			style: {
				fontSize:'15px'
			}
		},
		tooltip: {
			shared: true,
			useHTML: true
			
		},
		
		
		plotOptions: {
			column: {
				pointPadding: 0.2,
				borderWidth: 0
			}
		},
		legend: {
			enabled: false
		},
		series: [
		{
			name: "Temperature",
			color:'#DC143C',
			data: temps

		}
		
		]
	});
	
	
	Highcharts.chart('container2', {
		chart: {
			backgroundColor:'#F5F5DC',
			plotBackgroundColor: '#FFFFFF',
			type: 'column'
		},
		title: {
			text: 'Humidity comparison'
			,
			style: {
				fontSize:'18px'
			}
		},

		xAxis: {
			categories: cities,

			title : {
				text: 'Location'
				,
				style: {
					fontSize:'15px'
				}
			
			},
			crosshair: true
	
		},
		yAxis: {
			// min: 0,
			title: {
				text: 'Humidity(%)'
			}
			,
			style: {
				fontSize:'15px'
			}
		},
		tooltip: {
			shared: true,
			useHTML: true
			
		},
		
		
		plotOptions: {
			column: {
				pointPadding: 0.2,
				borderWidth: 0
			}
		},
		legend: {
			enabled: false
		},
		series: [
		{
			name: "Humidity",
			// color:'#DC143C',
			data: humids

		}
		
		]
	});
	
	
	Highcharts.chart('container3', {
		chart: {
			backgroundColor:'#F5F5DC',
			plotBackgroundColor: '#FFFFFF',
			type: 'column'
			
		},
		title: {
			text: 'Pressure comparison'
			,
			style: {
				fontSize:'18px'
			}
		},

		xAxis: {
			categories: cities,

			title : {
				text: 'Location'
				,
				style: {
					fontSize:'15px'
				}
			},
			crosshair: true
		},
		yAxis: {
			// min: 0,
			title: {
				text: 'Pressure(atm)'
			}
			,
			style: {
				fontSize:'15px'
			}
		},
		tooltip: {
			shared: true,
			useHTML: true
			
		},
		
		
		plotOptions: {
			column: {
				pointPadding: 0.2,
				borderWidth: 0
			}
		},
		legend: {
			enabled: false
		},
		series: [
		{
			name: "Pressure",
			color:'#008080',
			data: pressures

		}
		
		]
	});
	
	
}

