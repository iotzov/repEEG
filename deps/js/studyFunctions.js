/*

  This file contains all of the functions required for management/creation of studies

*/

// misc. functions

function exitProgram() {
	ipcRenderer.send('exit-clicked');
}

function restartApp(){
	remote.BrowserWindow.getAllWindows()[0].reload();
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function tsvJSON(tsv){

  var lines=tsv.split("\n");

  var result = [];

  var headers=lines[0].split("\t");

  for(var i=1;i<lines.length;i++){

	  var obj = {};
	  var currentline=lines[i].split("\t");

	  for(var j=0;j<headers.length;j++){
		  obj[headers[j]] = currentline[j];
	  }

	  result.push(obj);

  }

  return result; //JavaScript object
  //return JSON.stringify(result); //JSON
}

function importTSVFile(filePath) {
	var imports = fs.readFileSync(filePath, 'utf8');
	return tsvJSON(imports);
}

function createNewStudy(studyData) { // Function for initial study creation
	if(!fs.existsSync(path.join(studyFolder, studyData.Name))) {
		fs.mkdirSync(path.join(studyFolder, studyData.Name));
	};

	for(var k in studyData) {
		currentStudy[k] = studyData[k];
	};

	if(currentStudy.subject    == undefined){ currentStudy.subject      = [];};
	if(currentStudy.event      == undefined){ currentStudy.event        = [];};
	if(currentStudy.parameters == undefined){ currentStudy.parameters   = [];};
	if(currentStudy.task       == undefined){ currentStudy.task         = [];};
	if(currentStudy.stimulus   == undefined){ currentStudy.stimulus     = [];};
	if(currentStudy.uuid       == undefined){ currentStudy.uuid         = uuid();};
	if(currentStudy.recordings == undefined){ currentStudy.recordings   = [];};

	jsonfile.writeFileSync(path.join(studyFolder, studyData.Name, 'dataset_description.json'), studyData);
};

function updateRecordingsList(files) { // updates list of recordings on the add recording page
	for(var i = 0; i < files.length; i++) {
		var tempLI = $("<li class='small-text'>" + files[i].name + "     " + "</li>");
		//var tempButton = $("<button class='btn btn-xs btn-danger recording-list-remove-btn'>Remove</button>");
		var tempButton = $("<a class='recording-list-remove-btn ml-2'><i class='fa fa-trash-o' aria-hidden='true'></i></a>");
		tempLI.data().file = files[i].path;
		tempButton.click(function() {
			$(this).parent().remove();
		});
		$("#recordings-added-display-list").append(tempLI.append(tempButton));
	};
}

function createStudyInfoElement(dataObject) {
	// Creates elements for edit study info containers
	// dataObject => study item object w/ all fields for its type in addition to 'type' field

	var tempvar = $("<div></div>");
	tempvar.addClass('study-info-object');
	tempvar.addClass('col-2 m-2 text-light text-truncate');
	tempvar.addClass(dataObject.type+'-color');
	tempvar.text(dataObject.label);
	tempvar.data('studyElement', dataObject);
	tempvar.attr('id', dataObject.uuid);

	tempvar.popover({
		html: true,
		content: function(item) {
			var buttons = $();
			var editbtn   = $("<a class='mx-1 study-element-edit-btn'><i class='fa fa-pencil-square-o' aria-hidden='true'></i></a>");
			editbtn.click(dataObject, function(e) {
				$('.popover').popover('hide');
				e.preventDefault();
				var dataObject = e.data;
				$('#addNewModal').data('currentInfoType', dataObject.type);
				$('#addNewModal').data('editing', dataObject.uuid);
				$('#addNewModal').data('mode', 'edit');
				$('#addNewModal .modal-body').load('./forms/' + dataObject.type + '.html', function() {
					if($('#addNewModal').data('currentInfoType') == 'stimulus') {
						var currentEvents = $('#'+dataObject.uuid).closest('.main-content').find('.event').children('.study-info-object');
						currentEvents.each(function(ev) {
							var tmp = $('<option>' + $(this).data('studyElement').label + '</option>');
							$('.modal-body .link-event').append(tmp);
						});
					};
				});
				$('#addNewModalLabel').text('Add New ' + capitalizeFirstLetter(dataObject.type));
				$('#addNewModal').on('shown.bs.modal', function(e) {
					if($(e.currentTarget).data('mode') == 'edit') {
						for(elm in dataObject) {
							//$('.modal-body .form-group > :not(label)[name='+elm+']')[0].value = temp[elm];
							$('.modal-body .form-group > :not(label)[name='+elm+']').val(dataObject[elm]);
						};
					};
				});
				$('#addNewModal').modal('show');
			});
			buttons = buttons.add(editbtn);
			if(dataObject.type == 'stimulus') {
				buttons = buttons.add($("<i class='fa fa-eye mx-1' aria-hidden='true'></i>").click(function(e) {
					try {
					opn($('#'+dataObject.uuid).data('studyElement').stimulusLocation);
					console.log('Success displaying '+$('#'+dataObject.uuid).data('studyElement').stimulusLocation.replace(/^.*[\\\/]/, ''));
				} catch (err) {
					console.log('Error displaying '+$('#'+dataObject.uuid).data('studyElement').stimulusLocation.replace(/^.*[\\\/]/, ''));
					console.error(err);
				}
				}));
			};
			var tmp = $("<a class='mx-1 study-element-edit-btn'><i class='fa fa-trash mx-1' aria-hidden='true'></i></a>").data('target', dataObject.uuid);
			tmp.click(function(e) {
				var container = 	$('#'+$(this).data('target')).closest('.link-recording-wrapper');
				$('#'+$(this).data('target')).remove();
				$('.popover').popover('hide');
				container.trigger('elementsChanged');
			});
			buttons = buttons.add(tmp);
			return(buttons)
		}
	});

	// tempvar.prepend(editbtn);
	// tempvar.prepend(removebtn);

	return tempvar

};

function createRecordingObject(rec) {

	var tempvar = $("<div></div>");
	tempvar.addClass('study-info-object');
	tempvar.addClass('col-2 m-2 text-light text-truncate recordings-color');
	tempvar.attr('id', rec.uuid);
	// tempvar.attr('data-toggle', 'popover');
	// tempvar.attr('data-content', "<i class='fa fa-pencil-square-o' aria-hidden='true'></i>");
	// tempvar.attr('title', 'title');
	tempvar.popover({
		html: true,
		content: function(item) {
			var buttons = $();
			buttons = buttons.add($("<i class='fa fa-link mx-1' aria-hidden='true'></i>").click(rec,recordingEditLinks));
			buttons = buttons.add($("<i class='fa fa-eye mx-1' aria-hidden='true'></i>").click(function(e) {
				e.preventDefault();
				displayRecording(rec);
			}));
			var uploadbtn = $("<i class='fa fa-upload mx-1' aria-hidden='true'></i>").data('target', rec.uuid);
			uploadbtn.click(function(e) {
				var fileLocation = dialog.showOpenDialog({properties: ['openFile']});
				if(!fileLocation) {
					$('.popover').popover('hide');
					return
				}
				var oldrec = $('#'+$(this).data('target')).data('studyElement');
				var toDelete = $('#edit-study-page').data('toDelete');
				if(toDelete) {
					toDelete.push(oldrec.file);
				} else {
					toDelete = [oldrec.file];
				};
				$('#edit-study-page').data('toDelete', toDelete);
				oldrec.file = fileLocation[0];
				$('#'+$(this).data('target')).data('studyElement', oldrec);
				$('#'+$(this).data('target')).text(oldrec.file.replace(/^.*[\\\/]/, ''));
				$('.popover').popover('hide');
			});
			buttons = buttons.add(uploadbtn);
			var tmp = $("<i class='fa fa-trash mx-1' aria-hidden='true'></i>").data('target', rec.uuid);
			tmp.click(function(e) {
				$('#'+$(this).data('target')).remove();
				$(e.currentTarget).closest('.popover').hide();
			});
			buttons = buttons.add(tmp);
			return(buttons)
		}
	});
	tempvar.text(rec.file.replace(/^.*[\\\/]/, '').replace(rec.uuid, ''));

	tempvar.data('studyElement', rec);

	return tempvar

}

function recordingEditLinks(e) {

	var rec = e.data;
	$('#edit-study-link-page').data('currentRecording', rec);

	$('#edit-study-page').hide();
	$('#edit-study-link-page').show();

	$('#edit-study-link-page').data('currentStudy', $('#edit-study-page').data('editing'));
	$('#edit-study-link-page').data('currentRecording', rec);
	// $(e.currentTarget).closest('.popover').popover('hide');
	$('.popover').popover('hide');

	var elements = ['subject', 'stimulus', 'event', 'task', 'parameters'];

	var currentStudy = $('#edit-study-link-page').data('currentStudy');

	for(var i = 0; i < elements.length; i++) {

		_.forEach(rec[elements[i]], function(elm) {

			$('#edit-study-link-page .link-recording-wrapper.'+elements[i]).append(createStudyInfoElement(getItemByUUID(elm)));

		});

	};

};

function editStudyAddAuthor(e) {

	e.preventDefault();
	console.log($(this));
	$(this).before($('<div class="form-group"><input class="form-control" name="Authors[]" placeholder="Author Name"></div>'));

}

/*

Data management functions below

Used to load, store, and modify data stored in .json files on local machine


*/

// returns study with corresponding uuid
function getStudyByUUID(uuid) {

	return _.filter(studies, function(obj){
		return obj.uuid == uuid;
	})[0];

}

// replaces item in study w/ matching uuid with obj
function replaceItem(uuid, study, obj) {

	for(var i = 0; i < study[obj.type].length; i++) {



	};

}

// returns study element corresponding to uuid
function getItemByUUID(uuid) {

	loadElements();
	var tmp = _.flatten(_.values(studyElements));

	return _.filter(tmp, function(obj) {
		return obj.uuid == uuid;
	})[0];

}

function containsItem(item, study){ // returns true if 'study' contains 'item' of type 'dataType', false otherwise

	var type = item.type;

	return !_.isEmpty(_.filter(study[type], function(obj) {
		return obj.uuid == item.uuid
	}));

}

function findMatchingStudies(item) { // returns list of studies that have element 'item' in them

	return _.filter(studies, function(obj) {
		return containsItem(item, obj);
	});

}

function loadStudies() {

	if(!fs.existsSync('studies.json')) {

		jsonfile.writeFileSync('studies.json', []);

	}

	studies = jsonfile.readFileSync('studies.json', {
		throws: false
	});

	if(studies == null) {
		studies = [];
		jsonfile.writeFileSync('studies.json', studies);
	};

}

function loadElements() {

	loadStudies();

	keySet = [
		'subject',
		'stimulus',
		'parameters',
		'task',
		'event',
		'recordings'
	];

	studyElements = {};

	for(var i=0; i < keySet.length; i++) {

		studyElements[keySet[i]] = [];

		for(var j=0; j < studies.length; j++) {

			studyElements[keySet[i]] = _.concat(studyElements[keySet[i]], studies[j][keySet[i]]);

		}

	}

}

function saveStudies() {

	jsonfile.writeFileSync('studies.json', studies);

}

function saveThese(toSave) {

	jsonfile.writeFile('studies.json', toSave, function(err) {
		console.log(err)
	});
	console.log(toSave)

}

function addStudy(study) {

	loadStudies();
	studies.push(study);
	jsonfile.writeFile('studies.json', studies);
	jsonfile.writeFile(path.join(studyFolder, study.Name, 'studyInfo.json'), study);

}

function studyComparison(one, two, key) {
	if(key==='uuid') {
		return true;
	};
	if(key==='study'){
		return true;
	};
}

// writes the js object representing the study to 'studyInfo.json' under that study's top folder
// each study's top folder is identical to its 'Name' property
function writeStudyToFile(study, callback) {

	if(callback) {
		jsonfile.writeFile(path.join(studyFolder, study.Name, 'studyInfo.json'), study, callback);
	} else {
		jsonfile.writeFile(path.join(studyFolder, study.Name, 'studyInfo.json'), study);
	};

}

// write info for all studies to the studyInfo.json file
// in each study's directory
function writeAllStudies() {

	_.forEach(studies, function(study) {
		jsonfile.writeFile(path.join(studyFolder, study.Name, 'studyInfo.json'), study, function(e) {
			console.log('Wrote '+study.Name);
		});
	});

}

function loadStudiesFromFolders() {

	fs.copySync('./studies.json', './studies.json.bakup');

	studies = [];

	_.forEach(fs.readdirSync(studyFolder), function(folder) {
		try {
		studies.push(jsonfile.readFileSync(path.join(studyFolder, folder, 'studyInfo.json')));
	} catch (err) {
		console.warn('Could not open '+folder);
	}
	});

	saveStudies();

}

// copy passed recording file to `studies` folder
async function copyRecording(recording, studyName) {
	// recording - object, recording object containing path of file to be copied
	// studyName - string, name of the study (found in study.Name)

	if(recording.file === path.join(studyFolder, studyName, recording.file.replace(/^.*[\\\/]/, ''))) {
		console.log('study '+studyName+' file '+recording.file.replace(/^.*[\\\/]/, '')+' already exists');
		return
	};
	if(!fs.existsSync(recording.file)) {
		console.error('study '+studyName+' file '+recording.file.replace(/^.*[\\\/]/, '')+' does not exist');
		return
	};

	try {
		var fileExtension = '.'+recording.file.split('.').pop();
		var newFileName = recording.file.replace(/^.*[\\\/]/, '');
		newFileName = newFileName.replace(fileExtension,'');
		newFileName = newFileName.replace(recording.uuid,'');
		await fs.copy(recording.file, path.join(studyFolder, studyName, newFileName+'_'+recording.uuid+fileExtension));
		// await fs.copy(recording.file, path.join(studyFolder, studyName, recording.file.replace(/^.*[\\\/]/, '').replace(fileExtension,recording.uuid+fileExtension)));
		console.log('Copied study '+studyName+' file '+recording.file.replace(/^.*[\\\/]/, ''));
	} catch (err) {
		console.error(err)
	}

}

// copy passed stimulus file to `stimuli` folder under `studies` folder
async function copyStimulus(stimulus, studyName) {
	// stimulus - object, stimulus object containing path of file to be copied
	// studyName - string, name of the study (found in study.Name)

	if(stimulus.stimulusLocation === path.join(studyFolder, studyName, stimulus.stimulusLocation.replace(/^.*[\\\/]/, ''))) {
		console.log('study '+studyName+' file '+stimulus.stimulusLocation.replace(/^.*[\\\/]/, '')+' already exists');
		return
	};
	if(!fs.existsSync(stimulus.stimulusLocation)) {
		console.error('study '+studyName+' file '+stimulus.stimulusLocation.replace(/^.*[\\\/]/, '')+' does not exist');
		return
	};

	try {
		var fileExtension = '.'+stimulus.stimulusLocation.split('.').pop();
		var newFileName = stimulus.stimulusLocation.replace(/^.*[\\\/]/, '');
		newFileName = newFileName.replace(fileExtension,'');
		newFileName = newFileName.replace(stimulus.uuid,'');
		await fs.copy(stimulus.stimulusLocation, path.join(studyFolder, studyName, 'stimuli', newFileName+'_'+stimulus.uuid+fileExtension));
		console.log('Copied study '+studyName+' file '+stimulus.stimulusLocation.replace(/^.*[\\\/]/, ''));

	} catch (err) {
		console.error(err)
	}

}

// copy passed stimulus file to `stimuli` folder under `studies` folder
async function copyChannelLocations(locs, studyName) {
	// stimulus - object, stimulus object containing path of file to be copied
	// studyName - string, name of the study (found in study.Name)

	try {
		await fs.copy(stimulus.stimulusLocation, path.join(studyFolder, studyName, 'stimuli', stimulus.stimulusLocation.replace(/^.*[\\\/]/, '')))
		console.log('Copied study '+studyName+' file '+stimulus.stimulusLocation.replace(/^.*[\\\/]/, ''));
	} catch (err) {
		console.error(error)
	}

}

// returns md5 hash of the requested file
function getmd5(toHash) {
	// toHash - full path of the file to be hashed
	// returns - string, md5 hash of requested file

	return md5.sync(toHash)

};

// checks if the md5 hash of requested file is identical to passed hash
function checkFile(aHash, aPath) {
	// aHash - string, hash returned by getmd5() function
	// aPath - string, path to file to check
	// returns - true if identical, false otherwise

	return aHash == getmd5(aPath);

}

function displayRecording(recording) {

	var options = {
		mode: 'json',
		args: [recording.uuid,recording.file],
		// pythonPath: 'python3',
		scriptPath: pythonFolder
	};

	pyshell.run('displayRecording.py', options, function(err, msg) {

		if(err) console.log(err);
		console.log('Success displaying '+recording.file.replace(/^.*[\\\/]/, ''));

	});

}

function copyAllStudyFiles(study) {

	_.forEach(study.recordings, function(rec,idx) {
		copyRecording(rec, study.Name);
		var fileExtension = '.'+rec.file.split('.').pop();
		var newFileName = rec.file.replace(/^.*[\\\/]/, '');
		newFileName = newFileName.replace(fileExtension,'');
		newFileName = newFileName.replace(rec.uuid,'');
		study.recordings[idx].originalLocation = study.recordings[idx].file;
		study.recordings[idx].file = path.join(studyFolder, study.Name, newFileName+'_'+rec.uuid+fileExtension);
	});

	_.forEach(study.stimulus, function(stim,idx) {
		copyStimulus(stim, study.Name);
		var fileExtension = '.'+stim.stimulusLocation.split('.').pop();
		var newFileName = stim.stimulusLocation.replace(/^.*[\\\/]/, '');
		newFileName = newFileName.replace(fileExtension,'');
		newFileName = newFileName.replace(stim.uuid,'');
		study.stimulus[idx].originalLocation = study.stimulus[idx].stimulusLocation;
		study.stimulus[idx].stimulusLocation = path.join(studyFolder, study.Name, newFileName+'_'+stim.uuid+fileExtension);
	});

	return study

}

function copyStudyFilesForAllStudies() {

	_.forEach(studies, function(study,idx) {
		studies[idx] = copyAllStudyFiles(study);
	})

}

function checkFileIntegrity() {

	loadStudies();

	studyFolder = getStudyFolder();

	var totalRecs = 0;
	var foundRecs = 0;
	var recoveredRecs = 0;
	var missingRecs = 0;

	_.forEach(studies, function(study, studyidx) {

		_.forEach(study.recordings, function(rec, recidx) {

			totalRecs += 1;

			if(fs.existsSync(rec.file)) {
				foundRecs += 1;
			} else {

				if(fs.existsSync(path.join(studyFolder,study.Name,rec.file.replace(/^.*[\\\/]/, '')))) {
					studies[studyidx].recordings[recidx].file = path.join(studyFolder,study.Name,rec.file.replace(/^.*[\\\/]/, ''));
					recoveredRecs += 1;
				} else {
					console.error('study '+study.Name+' file '+rec.file.replace(/^.*[\\\/]/, '')+' cannot be found!');
					missingRecs += 1;
				}

			}

		})

	})

	console.log('total # of recordings: '+totalRecs);
	console.log('found # of recordings: '+foundRecs);
	console.log('recovered # of recordings: '+recoveredRecs);
	console.log('missing # of recordings: '+missingRecs);

	saveStudies();

	var totalFound = foundRecs+recoveredRecs;

	$('#main-area').prepend(
		$('<div class="alert alert-success alert-dismissible fade show" role="alert">'+totalFound+' data files verified successfully.</div>').append(
			$('<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>')
		)
	);

}

function copyFromOriginals(study) {

	_.forEach(study.recordings, function(rec) {
		try {
		fs.copySync(rec.originalLocation, rec.file)
		console.log('copied '+rec.file)
	} catch(err) {
		console.warn(err);
	}
	})

}

// end of file functions

/*

  Functions for creating and managing drag n drop functionality

*/



/*

  Functions for creating and managing the main page table

*/

function createHomeTable() {

	var data = [];

	loadStudies();

	for(var i=0; i < studies.length; i++) {

		data.push({
			name: studies[i].Name,
			description: studies[i].studyDescription,
			numSubjects: studies[i].subject.length,
			numStimuli: studies[i].stimulus.length,
			uuid: studies[i].uuid,
			numRecordings: studies[i].recordings.length
		});

	};

	$('#home-table').bootstrapTable({
		columns: [{
			field: 'name',
			title: 'Study',
			sortable: true,
			// formatter: createEditLink
		}, {
			field: 'numRecordings',
			title: 'Number of Recordings',
			sortable: true
		}, {
			field: 'numSubjects',
			title: 'Number of Subjects',
			sortable: true
		}, {
			field: 'numStimuli',
			title: 'Number of Stimuli',
			sortable: true
		}, {
			field: 'description',
			title: 'Study Description',
			sortable: false
		}, {
			field: 'uuid',
			title: 'Edit/View Study',
			sortable: false,
			formatter: createEditLink
		}, {
			field: 'uuid',
			title: 'UUID',
			sortable: false,
			visible: false
		}],
		search: true,
		pagination: true,
		showToggle: true,
		showRefresh: true,
		showColumns: true,
		iconsPrefix: 'fa',
		icons: {
			paginationSwitchDown: 'fa-collapse-down icon-chevron-down',
			paginationSwitchUp: 'fa-collapse-up icon-chevron-up',
			refresh: 'fa-refresh icon-refresh',
			toggle: 'fa-list-alt icon-list-alt',
			columns: 'fa-th icon-th',
			detailOpen: 'fa-plus icon-plus',
			detailClose: 'fa-minus icon-minus'
		},
		data
	});

	$('.home-table-wrapper [title="Refresh"]').on('click', (event) => {
		event.preventDefault();
		updateHomeTable();
	});
};

function updateHomeTable(callback) {

	var data = [];

	loadStudies();

	for(var i=0; i < studies.length; i++) {

		data.push({
			name: studies[i].Name,
			description: studies[i].studyDescription,
			numSubjects: studies[i].subject.length,
			numStimuli: studies[i].stimulus.length,
			uuid: studies[i].uuid,
			numRecordings: studies[i].recordings.length
		});

	};

	if(~_.isEmpty(data)) {
		$('#home-table').bootstrapTable('load', data);
	} else {
		$('#home-table').bootstrapTable('removeAll')
	};

	$('.home-table-wrapper .edit-study-link').click(function(e) {

		$('#edit-study-page .edit-study-element-container').empty();
		$('#edit-study-page .edit-study-item-and-button-container').hide();

		var study = getStudyByUUID($(this).data('uuid'));

		var elements = ['subject', 'stimulus', 'event', 'task', 'parameters'];

		for(var i=0; i < elements.length; i++) {

			study[elements[i]].forEach(function(elm) {

				$('#edit-study-page .'+elm.type+'.edit-study-element-container').append(createStudyInfoElement(elm));

			});

		};

		study.recordings.forEach(function(rec) {

			$('#edit-study-page .recordings.edit-study-element-container').append(createRecordingObject(rec));

		});

		hideAllSections();

		$('.edit-study-page-container-toggle').trigger('updateThis');

		$('#edit-study-page').data('editing', study);

		$('#edit-study-page').show();
		$('#studyElementsNavBar').show();

		//recordings
	});

	if(callback){
		callback();
	}

}

function createEditLink(text, row, column) {

	return [
		"<a href='javascript:void(0)' onclick='openEditStudyPage(this)' class='edit-study-link' data-uuid=",
		text,
		">View/Edit</a>"
	].join('');

}

function openEditStudyPage(trigger) {

	$('#edit-study-page .edit-study-element-container').empty();
	$('#edit-study-page .edit-study-item-and-button-container').hide();

	var study = getStudyByUUID($(trigger).data('uuid'));

	currentStudy = study;

	var elements = ['subject', 'stimulus', 'event', 'task', 'parameters'];

	for(var i=0; i < elements.length; i++) {

		study[elements[i]].forEach(function(elm) {

			$('#edit-study-page .'+elm.type+'.edit-study-element-container').append(createStudyInfoElement(elm));

		});

	};

	study.recordings.forEach(function(rec) {

		$('#edit-study-page .recordings.edit-study-element-container').append(createRecordingObject(rec));

	});

	hideAllSections();

	$('.edit-study-element-container').trigger('elementsChanged');

	$('#edit-study-page').data('editing', study);

	$('#edit-study-page').show();
	$('#studyElementsNavBar').show();

}

/*

	End home table section

*/


/*

	Functions for creating/updating/managing the element display table

*/

function createElementTable() {

	var data = [];

	loadElements();

	for(var i in studyElements) {

		for(var j=0; j < studyElements[i].length; j++){
			data.push({
				name: studyElements[i][j].label,
				type: studyElements[i][j].type,
				uuid: studyElements[i][j].uuid,
				study: studyElements[i][j].study
			});
		}

	};

	$('#element-display-table').bootstrapTable({
		columns: [{
			checkbox: true
		}, {
			field: 'name',
			title: 'Item Label',
			sortable: true,
			// formatter: createEditLink
		}, {
			field: 'type',
			title: 'Element Type',
			sortable: true
		}, {
			field: 'uuid',
			title: 'UUID',
			sortable: false,
			visible: false
		}, {
			field: 'study',
			title: 'Original Study',
			sortable: true,
			visible: true
		}],
		search: true,
		pagination: true,
		showToggle: true,
		showRefresh: true,
		showColumns: true,
		pageSize: 25,
		maintainSelected: true,
		iconsPrefix: 'fa',
		icons: {
			paginationSwitchDown: 'fa-collapse-down icon-chevron-down',
			paginationSwitchUp: 'fa-collapse-up icon-chevron-up',
			refresh: 'fa-refresh icon-refresh',
			toggle: 'fa-list-alt icon-list-alt',
			columns: 'fa-th icon-th',
			detailOpen: 'fa-plus icon-plus',
			detailClose: 'fa-minus icon-minus'
		},
		data
	});

	$('#element-display-page [title="Refresh"]').on('click', (event) => {
		event.preventDefault()
		updateElementTable()
	});
}

function updateElementTable() {}

/*

	End element display table section

*/

/*

	functions for creating/modifying modal table

*/

function createModalTable_import(type) {

	$('#import-link-table').bootstrapTable({
		columns: [{
			checkbox: true
		}, {
			field: 'label',
			title: 'Label',
			sortable: true,
		}, {
			field: 'study',
			title: 'Study',
			sortable: true,
		}, {
			field: 'uuid',
			title: 'UUID',
			sortable: false,
		}],
		pagination: false,
		showColumns: false,
		trimOnSearch: false,
		clickToSelect: true,
		height: 400,
		data: studyElements[type]
	});

}

function createModalTable_link(type, study) {

	$('#import-link-table').bootstrapTable({
		columns: [{
			checkbox: true
		}, {
			field: 'label',
			title: 'Label',
			sortable: true,
		}, {
			field: 'study',
			title: 'Study',
			sortable: true,
		}, {
			field: type + 'Description',
			title: 'Description',
			sortable: false
		}, {
			field: 'uuid',
			title: 'UUID',
			sortable: false,
			visible: false,
		}],
		pagination: false,
		showColumns: true,
		clickToSelect: true,
		height: 400,
		iconsPrefix: 'fa',
		icons: {
			paginationSwitchDown: 'fa-collapse-down icon-chevron-down',
			paginationSwitchUp: 'fa-collapse-up icon-chevron-up',
			refresh: 'fa-refresh icon-refresh',
			toggle: 'fa-list-alt icon-list-alt',
			columns: 'fa-th icon-th',
			detailOpen: 'fa-plus icon-plus',
			detailClose: 'fa-minus icon-minus'
		},
		data: study[type]
	});

}

/*

	end modal table section

*/

function initializeSelectDataTable(type) {

	loadElements();

	var data = studyElements[type];

	$('#data-select-table').bootstrapTable({
		columns: [{
			checkbox: true
		}, {
			field: 'label',
			title: 'Item Label',
			sortable: true,
			// formatter: createEditLink
		}, {
			field: 'uuid',
			title: 'UUID',
			sortable: false,
			visible: false
		}],
		search: true,
		pagination: true,
		showToggle: true,
		showRefresh: true,
		showColumns: true,
		pageSize: 25,
		maintainSelected: true,
		iconsPrefix: 'fa',
		icons: {
			paginationSwitchDown: 'fa-collapse-down icon-chevron-down',
			paginationSwitchUp: 'fa-collapse-up icon-chevron-up',
			refresh: 'fa-refresh icon-refresh',
			toggle: 'fa-list-alt icon-list-alt',
			columns: 'fa-th icon-th',
			detailOpen: 'fa-plus icon-plus',
			detailClose: 'fa-minus icon-minus'
		},
		data
	});

	$('#export-data-select [title="Refresh"]').on('click', (event) => {
		event.preventDefault()
		updateElementTable()
	});

}

function hideAllSections() {
	$('.main-content').hide();
	$('#studyElementsNavBar').hide();
	$('#mainNavBar').hide();
}

function channelLocationsFileSelection() {

	// var fileLocation = dialog.showOpenDialog({properties: ['openFile']});

	// console.log(fileLocation);

	// $('.channel-locations-button').data('fileLocation', fileLocation[0]);

	// $('.channel-locations-button').after('    '+fileLocation[0].replace(/^.*[\\\/]/, ''));

	// $('#addNewModal').data('fileLocation', fileLocation[0]);

	console.log('success');

};

function sortContainer(container) {

  var sort_by_name = function(a, b) {
    return a.innerHTML.toLowerCase().localeCompare(b.innerHTML.toLowerCase());
  }

  var list = container.children().get();
  list.sort(sort_by_name);
  for (var i = 0; i < list.length; i++) {
    list[i].parentNode.appendChild(list[i]);
  }

};
