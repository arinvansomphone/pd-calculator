const treatments = {
    treatment1: null,
    treatment2: null
};


const savedInputs = {
    treatment1: null,
    treatment2: null
  };

const horizontalPunYAxisPlugin = { id: 'horizontalPunYAxis' };


['mtac', 'volume', 'gen'].forEach(id => {
  document.getElementById(id).addEventListener('input', e => {
    // nothing to do except know it now has content
    // (auto-calc will skip because value !== "")
  });
});


function setupEventListeners() {
    // Attach change event to all solute radio buttons
    document.querySelectorAll('input[name="solute"]').forEach(radio => {
        radio.addEventListener('change', () => {
            populateSoluteValues();
        });
    });

    // Add event listeners for reset buttons
    document.querySelectorAll('.reset-btn').forEach(button => {
        button.addEventListener('click', () => {
            const fieldId = button.getAttribute('data-reset');
            resetOne(fieldId);
        });
    });

    // Add event listener for default input button
    document.getElementById('defaultInput').addEventListener('click', defaultInput);

    document.getElementById('weight').addEventListener('input', populateSoluteValues);
    document.getElementById('height').addEventListener('input', populateSoluteValues);
    document.getElementById('sex').addEventListener('change', populateSoluteValues);
    document.getElementById('pna').addEventListener('input', populateSoluteValues);

    // Form submission handlers
    document.getElementById('run-tx1').addEventListener('click', (e) => {
        e.preventDefault();
        if (!validateForm()) return;
        handleTreatmentToggle('treatment1');
    });
      
    document.getElementById('run-tx2').addEventListener('click', (e) => {
        e.preventDefault();
        if (!validateForm()) return;
        handleTreatmentToggle('treatment2');
    });

    // Add form submit handler
    document.getElementById('pdCalculatorForm').addEventListener('submit', (e) => {
        e.preventDefault();
        if (!validateForm()) return;
    });

    [
        'variable',   // Plasma / Volume / Dialysate conc / Dialysate volume
        'zoom',       // Zoomed In / Zoomed Out
        'add'         // Include Avg / Exclude
    ].forEach(name => {
        document
            .querySelectorAll(`input[name="${name}"]`)
            .forEach(radio => radio.addEventListener('change', redrawBothLines));
    });
    
    document
    .querySelectorAll('input[name="displayTreatmentInfo"]')
    .forEach(radio => radio.addEventListener('change', () => {
        const key = radio.value;
        // Toggle color mode based on selected prescription
        if (key === 'treatment2') {
            document.body.classList.add('treatment2-selected');
        } else {
            document.body.classList.remove('treatment2-selected');
        }
        const snap = savedInputs[key];
        if (!snap) return;

        // Don't clear the display when switching treatments
        // clearDisplay();
        displayPrescription(snap);
        updateHeaders(key);
    }));
}

document.addEventListener("DOMContentLoaded", () => {
    setupEventListeners();
    // Call the function immediately to populate defaults
    populateSoluteValues();
    // Always show disclaimer on page load
    showDisclaimer();
});


function setIfEmpty(el, value) {
  if (el.value === '') el.value = value;
}


function resetOne(id) {
  const el = document.getElementById(id);
  el.value = '';          // make it empty
  populateSoluteValues(); // auto-calc fills because it's now blank
}


function computeVolume(weight, height, sex) {
    const weightError = document.getElementById('weightError');
    const heightError = document.getElementById('heightError');
    const sexError = document.getElementById('sexError');

    weightError.textContent = '';
    heightError.textContent = '';
    sexError.textContent = '';

    if (!weight){
        weightError.textContent = 'A number is required';
        return "";
    }
    if (!height){
        heightError.textContent = 'A number is required';
        return "";
    }
    if (sex != "M" && sex != "F"){
        sexError.textContent = 'A number is required';
        return "";
    }

    weight = parseFloat(weight);
    height = parseFloat(height);
    
    if (sex === 'M') {
        return (0.194786 * height + 0.296785 * weight - 14.012934);
    } else if (sex === 'F') {
        return (0.34454 * height + 0.183809 * weight - 35.270121);
    } else {
        return '';
    }
}

function computeGeneration(pna) {
    if (!pna) return '';
    return pna * 0.154;
}

function populateSoluteValues() {
    const solute =
    document.querySelector('input[name="solute"]:checked')?.value;
    if (!solute) return;

    const mtac   = document.getElementById('mtac');
    const volume = document.getElementById('volume');
    const gen    = document.getElementById('gen');

    if (solute === 'urea') {
        setIfEmpty(mtac, 23);                           // default MTAC
        const w   = +document.getElementById('weight').value;
        const h   = +document.getElementById('height').value;
        const sex =  document.getElementById('sex').value;
        const pna = +document.getElementById('pna').value;

        const computedVolume = computeVolume(w, h, sex);
        const computedGen = computeGeneration(pna);
        
        if (computedVolume) {
            setIfEmpty(volume, parseFloat(computedVolume).toFixed(2));
        }
        if (computedGen) {
            setIfEmpty(gen, parseFloat(computedGen).toFixed(2));
        }
    } else {
        // for 'other' just make sure nothing auto-fills
        setIfEmpty(mtac,   '');
        setIfEmpty(volume, '');
        setIfEmpty(gen,    '');
    }
}
  

function clearDisplay () {
    document.querySelectorAll('.js-wipe').forEach(el => {
        // Skip daily exchange table inputs
        if (el.id && (el.id.startsWith('exVolume') || el.id.startsWith('exTime') || el.id.startsWith('exScheme'))) {
            return;
        }

        // Text / number / hidden inputs, textareas
        if (el instanceof HTMLInputElement ||
            el instanceof HTMLTextAreaElement) {
            el.value   = '';
            el.checked = false;              // un-tick any radios / checkboxes
            return;
        }

        // Dropdowns
        if (el instanceof HTMLSelectElement) {
            el.selectedIndex = 0;           // reset to the first <option>
            return;
        }

        // Everything else (tables, divs, canvases, …)
        el.innerHTML = '';
    });
}


function gatherFormInputs(){
    var age = parseFloat(document.getElementById('age').value);
    var height = parseFloat(document.getElementById('height').value);
    var weight = parseFloat(document.getElementById('weight').value);
    var sex = document.getElementById('sex').value;
    console.log("Sex", sex);
    var kru = parseFloat(document.getElementById('kru').value);
    var solute = document.querySelector('input[name="solute"]:checked').value
    var mtac = parseFloat(document.getElementById('mtac').value);
    var volume = parseFloat(document.getElementById('volume').value);
    var gen = parseFloat(document.getElementById('gen').value);
    var pna = parseFloat(document.getElementById('pna').value);

    var m_fluid_removal = parseFloat(document.getElementById('m_fluid_removal').value);
    var a_fluid_removal = parseFloat(document.getElementById('a_fluid_removal').value);

    var days = Array.from(
        document.querySelectorAll('input[name="day"]:checked')
      ).map(chk => chk.value);
      

    var volumeData = [];
    var timeData = [];
    var schemeData = [];
    var totATime = 0;
    var totMTime = 0;
    var deadTime = 0.25; //hours
    var totalExchangeTime = 0;

    for (var i = 1; i <= 7; i++) {
        // Construct the ID for the current element

        var currentId = 'exVolume ' + i;
        // Get the element by its ID
        var element = document.getElementById(currentId);

        // Check if the element exists
        if (element) {
            volumeValue = element.value;
            // Parse the element's text content into a float value and push it into the volumeData array
            // Check if the parsed value is a valid float
            if (volumeValue != 0){ // If it's a valid float
                volumeData.push(volumeValue); // Push the float value into the volumeData array
            }
        }
        console.log("VOLUME");
        console.log(volumeData);

        var currentId = 'exTime ' + i;
        var element = document.getElementById(currentId);

        // Check if the element exists
        if (element) {
            timeValue = parseFloat(element.value);
            // Parse the element's text content into a float value and push it into the volumeData array
            // Check if the parsed value is a valid float
            if (timeValue != 0 && !isNaN(timeValue)){ // If it's a valid float
                timeData.push(timeValue); // Push the float value into the volumeData array
            }
        }

        var currentId = 'exScheme ' + i;
        var element = document.getElementById(currentId);

        // Check if the element exists
        if (element) {
            schemeValue = element.value;
            // Parse the element's text content into a float value and push it into the volumeData array
            // Check if the parsed value is a valid float
            if (schemeValue != 'None'){ // If it's a valid float
                schemeData.push(schemeValue); // Push the float value into the volumeData array
                totalExchangeTime += timeValue; 
            }
            if (schemeValue == "A"){
                totATime = totATime + timeValue - deadTime;
            }
            else if (schemeValue == "M"){
                totMTime = totMTime + timeValue - deadTime;
            }
        }
    }
    return {kru, solute, mtac, volume, pna, m_fluid_removal, a_fluid_removal, volumeData, timeData, schemeData, days, totATime, totMTime, totalExchangeTime, age, height, weight, sex, gen};
}


function validateForm() {
    // Clear previous error messages
    document.querySelectorAll('.error').forEach(function(error) {
        error.textContent = '';
        hasErrors = false;
    });

    var age = document.getElementById('age').value;
    var height = document.getElementById('height').value;
    var weight = document.getElementById('weight').value;
    var sex = document.getElementById('sex').value;
    var pna = document.getElementById('pna').value;
    var kru = document.getElementById('kru').value;
    var solute = document.querySelector('input[name="solute"]:checked').value;
    var mtac = document.getElementById('mtac').value;
    var volume = document.getElementById('volume').value;
    var m_fluid_removal = document.getElementById('m_fluid_removal').value;
    var a_fluid_removal = document.getElementById('a_fluid_removal').value;
    var gen = document.getElementById('gen').value;

    var days = document.querySelectorAll('input[name="day"]:checked');
    var hasErrors = false;

    // Check age
    if (age.trim() === '') {
        document.getElementById('ageError').textContent = 'A number is required';
        hasErrors = true;
    } else if (isNaN(age)) {
        document.getElementById('ageError').textContent = 'A number is required';
        hasErrors = true;
    } else if (age < 0){
        document.getElementById('ageError').textContent = 'Number has to be greater or equal to 0';
        hasErrors = true;
    } else if (age > 150){
        document.getElementById('ageError').textContent = 'Number has to be smaller than 150. Make sure you are inputting for age';
        hasErrors = true;
    }
    // Check height
    if (height.trim() === '') {
        document.getElementById('heightError').textContent = 'A number is required';
        hasErrors = true;
    } else if (isNaN(height)) {
        document.getElementById('heightError').textContent = 'A number is required';
        hasErrors = true;
    } else if (height < 0) {
        document.getElementById('heightError').textContent = 'Number has to be greater or equal to 0';
        hasErrors = true;
    } else if (height > 300) {0
        document.getElementById('heightError').textContent = 'Number has to be smaller than 300, make sure input is in cm';
        hasErrors = true;
    }
    
    // Check weight
    if (weight.trim() === '') {
        document.getElementById('weightError').textContent = 'A number is required';
        hasErrors = true;
    } else if (isNaN(weight)) {
        document.getElementById('weightError').textContent = 'A number is required';
        hasErrors = true;
    } else if (weight < 0) {
        document.getElementById('weightError').textContent = 'Number has to be greater or equal to 0';
        hasErrors = true;
    } else if (weight > 700){
        document.getElementById('weightError').textContent = 'Number has to be smaller than 700, make sure input is in kg';
        hasErrors = true;
    }

    // Check sex -- make sure that something has been selected
    if (sex.trim() === '') {
        document.getElementById('sexError').textContent = 'Please select a sex';
        hasErrors = true;
    }
    
    // Check pna
    if (pna.trim() === '') {
        document.getElementById('pnaError').textContent = 'A number is required';
        hasErrors = true;
    } else if (isNaN(pna)) {
        document.getElementById('pnaError').textContent = 'A number is required';
        hasErrors = true;
    } else if (pna < 0) {
        document.getElementById('pnaError').textContent = 'Number has to be greater or equal to 0';
        hasErrors = true;
    }

    // Check kru
    if (kru.trim() === '') {
        document.getElementById('kruError').textContent = 'A number is required';
        hasErrors = true;
    } else if (isNaN(kru)) {
        document.getElementById('kruError').textContent = 'A number is required';
        hasErrors = true;
    } else if (kru < 0) {
        document.getElementById('kruError').textContent = 'Number has to be greater or equal to 0';
        hasErrors = true;
    }

    // Check solute -- make sure something has been selected
    if (solute.trim() === '') {
        document.getElementById('soluteError').textContent = 'Please select a solute';
        hasErrors = true;
    }

    // Check mtac
    if (mtac.trim() === '') {
        document.getElementById('mtacError').textContent = 'A number is required';
        hasErrors = true;
    } else if (isNaN(mtac)) {
        document.getElementById('mtacError').textContent = 'A number is required';
        hasErrors = true;
    } else if (mtac < 0) {
        document.getElementById('mtacError').textContent = 'Number has to be greater or equal to 0';
        hasErrors = true;
    }

    // Check volume 
    if (volume.trim() === '') {
        document.getElementById('volumeError').textContent = 'A number is required';
        hasErrors = true;
    } else if (isNaN(volume)) {
        document.getElementById('volumeError').textContent = 'A number is required';
        hasErrors = true;
    } else if (volume < 0) {
        document.getElementById('volumeError').textContent = 'Number has to be greater or equal to 0';
        hasErrors = true;
    }

    // check gen
    if (gen.trim() === '') {
        document.getElementById('genError').textContent = 'A number is required';
        hasErrors = true;
    } else if (isNaN(gen)) {
        document.getElementById('genError').textContent = 'A number is required';
        hasErrors = true;
    } else if (gen < 0) {
        document.getElementById('genError').textContent = 'Number has to be greater or equal to 0';
        hasErrors = true;
    }


    // Check m_fluid_removal
    if (m_fluid_removal.trim() === '') {
        document.getElementById('mFluidRemovalError').textContent = 'A number is required';
        hasErrors = true;
    } else if (isNaN(m_fluid_removal)) {
        document.getElementById('mFluidRemovalError').textContent = 'A number is required';
        hasErrors = true;
    } else if (m_fluid_removal < 1) {
        document.getElementById('mFluidRemovalError').textContent = 'Number has to be greater or equal to 1';
        hasErrors = true;
    }

    // Check a_fluid_removal
    if (a_fluid_removal.trim() === '') {
        document.getElementById('aFluidRemovalError').textContent = 'A number is required';
        hasErrors = true;
    } else if (isNaN(a_fluid_removal)) {
        document.getElementById('aFluidRemovalError').textContent = 'A number is required';
        hasErrors = true;
    } else if (a_fluid_removal < 1) {
        document.getElementById('aFluidRemovalError').textContent = 'Number has to be greater or equal to 1';
        hasErrors = true;
    }

    // Check if at least one day is selected
    if (days.length === 0) {
        document.getElementById('daysError').textContent = 'Please select at least one day';
        hasErrors = true;
    }

    // Check time 
    let total = 0;
    // Select all inputs whose id starts with "exTime"
    const timeInputs = document.querySelectorAll("input[id^='exTime']");
    timeInputs.forEach(function(input) {
        const value = parseFloat(input.value);
        if (!isNaN(value)) {
        total += value;
        }
    });
    
    // Get the error message container
    const errorMessage = document.getElementById('timeError');
    
    // Check if the total time is 24 or not.
    if (total > 24) {
        errorMessage.textContent = "The total time cannot be over 24 hours (currently " + total + " hours).";
        hasErrors = true;
    } 
    if (total <= 0){
        errorMessage.textContent = "Please make sure to input some exchange";
    }

    if (!hasErrors){
        return true;
    }
    return false;
}


function defaultInput() {

    var age = 50;
    var weight = 81;
    var height = 175;
    var sex = "M";

    var checkboxes = document.querySelectorAll('.days-of-week input[type="checkbox"]');
        checkboxes.forEach(function(checkbox) {
            checkbox.checked = true;
    });

    var days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
      

    volumeData = [2, 2, 2, 2];
    timeData = [2.25, 2.25, 2.25, 12.25];
    schemeData = ["A", "A", "A", "M"];

    var m_fluid_removal = 200;
    var a_fluid_removal = 800;
    var pna = 78;
    var kru = 2;

    
    var selectedSolute = "urea";

    displayValues(age, weight, height, sex, volume, volumeData, timeData, schemeData, m_fluid_removal, a_fluid_removal, pna, kru, selectedSolute, days);

}


function displayValues(age, weight, height, sex, volume, volumeData, timeData, schemeData, m_fluid_removal, a_fluid_removal, pna, kru, solute, days, gen){
    document.getElementById('volume').value = volume;
    document.getElementById('age').value = age;
    document.getElementById('weight').value = weight;
    document.getElementById('height').value = height;
    document.getElementById('sex').value = sex;
    document.getElementById('m_fluid_removal').value = m_fluid_removal;
    document.getElementById('a_fluid_removal').value = a_fluid_removal;
    document.getElementById('pna').value = pna;
    document.getElementById('kru').value = kru;
    document.getElementById('gen').value = gen;
    
    // Set default values for volumeData, timeData, and schemeData
    for (var i = 0; i < volumeData.length; i++) {
        document.getElementById('exVolume ' + (i + 1)).value = volumeData[i];
        document.getElementById('exTime ' + (i + 1)).value = timeData[i];
        document.getElementById('exScheme ' + (i + 1)).value = schemeData[i];
    }  

    document.querySelectorAll('input[name="day"]').forEach(chk => {
        chk.checked = days.includes(chk.value);
    });
    
    const defaultSolute = document.querySelector('input[name="solute"][value="' + solute + '"]');
    if (defaultSolute) {
        defaultSolute.checked = true;
        populateSoluteValues();
    }

}


function displayPrescription(snap) {
    // Only update specific fields, don't clear everything
    if (snap.age) document.getElementById('age').value = snap.age;
    if (snap.height) document.getElementById('height').value = snap.height;
    if (snap.weight) document.getElementById('weight').value = snap.weight;
    if (snap.sex) document.getElementById('sex').value = snap.sex;
    if (snap.pna) document.getElementById('pna').value = snap.pna;
    if (snap.kru) document.getElementById('kru').value = snap.kru;
    if (snap.mtac) document.getElementById('mtac').value = snap.mtac;
    if (snap.volume) document.getElementById('volume').value = snap.volume;
    if (snap.gen) document.getElementById('gen').value = snap.gen;
    if (snap.m_fluid_removal) document.getElementById('m_fluid_removal').value = snap.m_fluid_removal;
    if (snap.a_fluid_removal) document.getElementById('a_fluid_removal').value = snap.a_fluid_removal;

    // Update solute radio buttons
    if (snap.solute) {
        const soluteRadio = document.querySelector(`input[name="solute"][value="${snap.solute}"]`);
        if (soluteRadio) soluteRadio.checked = true;
    }

    // Update day checkboxes
    if (snap.days) {
        document.querySelectorAll('input[name="day"]').forEach(checkbox => {
            checkbox.checked = snap.days.includes(checkbox.value);
        });
    }

    // Update daily exchange table
    if (snap.volumeData && snap.timeData && snap.schemeData) {
        for (let i = 1; i <= 7; i++) {
            const volumeInput = document.getElementById(`exVolume ${i}`);
            const timeInput = document.getElementById(`exTime ${i}`);
            const schemeSelect = document.getElementById(`exScheme ${i}`);
            
            if (volumeInput && snap.volumeData[i-1]) volumeInput.value = snap.volumeData[i-1];
            if (timeInput && snap.timeData[i-1]) timeInput.value = snap.timeData[i-1];
            if (schemeSelect && snap.schemeData[i-1]) schemeSelect.value = snap.schemeData[i-1];
        }
    }
}


function pdCalculator(kru, solute, mtac, volume, pna, m_fluid_removal, a_fluid_removal, volumeData, timeData, schemeData, days, totATime, totMTime, totalExchangeTime, gen){
    
    kru = kru / 1.08;
    
    const scaledVolume = volumeData.map(v => v * 1000);

    var numExchange = scaledVolume.length;
    var numOfTreatment = days.length;
    
    var deadTime = 0.25; // dead time = 15 minutes
    var deadVolumeDialysate = 150; // dead volume dialysate = 150 mL

    let plasmaConcentration = new Array(7 * 24 * 60).fill(0);
    let peakConcentration = new Array(numExchange * numOfTreatment).fill(0);
    let dialysateConcentration = new Array(7 * 24 * 60).fill(0);
    let volumeofDistribution = new Array(7 * 24 * 60).fill(0);
    let volDialysate = new Array(7 * 24 * 60).fill(0);
    let amountDialysate = new Array(7 * 24 * 60).fill(0);
    let plasmaToDialysate = new Array(7 * 24 * 60).fill(0);
    let plasmaToDialysateDiffusion = new Array(7 * 24 * 60).fill(0);
    let plasmaToDialysateConvection = new Array(7 * 24 * 60).fill(0);
    let amountBody = new Array(7 * 24 * 60).fill(0);
    let netMovtIn = new Array(7 * 24 * 60).fill(0);
    let excretion = new Array(7 * 24 * 60).fill(0);
    let coverbar = new Array(7 * 24 * 60).fill(0);

    let initial_equilibrium_tolerance = 0.001;
    let initial_steady_state = 0;
    let initial_Concentration = 1;
    let t = 0;
    let peak_index = 0;

    var totalAEffectiveTime = 0;
    var totalMEffectiveTime = 0;

    for (let k = 0; k < numExchange; k ++){
        if(schemeData[k] == "M"){
            totalMEffectiveTime += timeData[k] - deadTime;
        }
        else if (schemeData[k] == "A"){
            totalAEffectiveTime += timeData[k] - deadTime;
        }
    }

    var volume_intake = (m_fluid_removal + a_fluid_removal)/1440;
    var fluidARemovalRate = a_fluid_removal/(totalAEffectiveTime * 60);
    var fluidMRemovalRate = m_fluid_removal/(totalMEffectiveTime * 60);

    var beta = 0;
    var uf = 0;
    var f = 0;
    
    var daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    
    const max_iter = 1000;
    let iterCount = 0;
    while (initial_steady_state == 0 && iterCount++ < max_iter) {
        for (let day = 0; day < 7; day++) {
            if (days.includes(daysOfWeek[day])) {
                for (let exchange = 0; exchange < numExchange; exchange++){
                    if (schemeData[exchange] == "M"){
                        uf = fluidMRemovalRate;
                    }
                    else{
                        uf = fluidARemovalRate;
                    }
                    beta = uf / mtac;
                    f = (1 / beta) - (1 / (Math.exp(beta) - 1));

                    var effectiveTime = (timeData[exchange] - deadTime) * 60;
                    var totalTime = timeData[exchange] * 60;
                    console.log(kru, gen, volume_intake, volume, mtac);
                    initialTime = t;

                    // start of a day
                    if (t == 0){
                        plasmaConcentration[t] = initial_Concentration;
                        volumeofDistribution[t] = volume;
                        volDialysate[t] = deadVolumeDialysate + scaledVolume[exchange];
                        amountDialysate[t] = deadVolumeDialysate / 100 * plasmaConcentration[t];
                        amountBody[t] = plasmaConcentration[t] * volume * 10;
                        dialysateConcentration[t] = amountDialysate[t] / volDialysate[t] * 100;
                        plasmaToDialysateDiffusion[t] = (plasmaConcentration[t] - dialysateConcentration[t])* mtac / 100;
                        plasmaToDialysateConvection[t] = (plasmaConcentration[t] - f * (plasmaConcentration[t] - dialysateConcentration[t])) * uf / 100;
                        plasmaToDialysate[t] = plasmaToDialysateDiffusion[t] + plasmaToDialysateConvection[t];
                        excretion[t] = plasmaConcentration[t] * kru / 100;
                        netMovtIn[t] = gen - excretion[t] - plasmaToDialysate[t];

                        peakConcentration[peak_index] = plasmaConcentration[t];
                        peak_index += 1;

                        t += 1;
                    }

                    // reset from dead time
                    else{
                        volumeofDistribution[t] = volumeofDistribution[t - 1] + (volume_intake - uf)/1000;
                        volDialysate[t] = deadVolumeDialysate + scaledVolume[exchange];
                        amountDialysate[t] = amountDialysate[t - 1] + plasmaToDialysate[t - 1];
                        plasmaConcentration[t] = ((plasmaConcentration[t - 1] * 10 * volumeofDistribution[t-1]) + netMovtIn[t - 1])/(volumeofDistribution[t] * 10);
                        dialysateConcentration[t] = amountDialysate[t] / volDialysate[t] * 100;
                        plasmaToDialysateDiffusion[t] = (plasmaConcentration[t] - dialysateConcentration[t])* mtac / 100;
                        plasmaToDialysateConvection[t] = (plasmaConcentration[t] - f * (plasmaConcentration[t] - dialysateConcentration[t])) * uf / 100;
                        plasmaToDialysate[t] = plasmaToDialysateDiffusion[t] + plasmaToDialysateConvection[t];
                        amountBody[t] = amountBody[t - 1] * netMovtIn [t - 1];
                        excretion[t] = plasmaConcentration[t] * kru / 100;
                        netMovtIn[t] = gen - excretion[t] - plasmaToDialysate[t];

                        peakConcentration[peak_index] = plasmaConcentration[t - 1];
                        peak_index += 1;
                        t += 1;
                    }

                    // doing an exchange
                    while (t < (initialTime + effectiveTime)){
                        volumeofDistribution[t] = volumeofDistribution[t - 1] + (volume_intake - uf)/1000;
                        volDialysate[t] = volDialysate[t - 1] + uf;
                        amountDialysate[t] = amountDialysate[t - 1] + plasmaToDialysate[t - 1];
                        plasmaConcentration[t] = ((plasmaConcentration[t - 1] * 10 * volumeofDistribution[t-1]) + netMovtIn[t - 1])/(volumeofDistribution[t] * 10);
                        dialysateConcentration[t] = amountDialysate[t] / volDialysate[t] * 100;
                        plasmaToDialysateDiffusion[t] = (plasmaConcentration[t] - dialysateConcentration[t])* mtac / 100;
                        plasmaToDialysateConvection[t] = (plasmaConcentration[t] - f * (plasmaConcentration[t] - dialysateConcentration[t])) * uf / 100;
                        plasmaToDialysate[t] = plasmaToDialysateDiffusion[t] + plasmaToDialysateConvection[t];
                        amountBody[t] = amountBody[t - 1] * netMovtIn [t - 1];
                        excretion[t] = plasmaConcentration[t] * kru / 100;
                        netMovtIn[t] = gen - excretion[t] - plasmaToDialysate[t];

                        t += 1;
                    }

                    // during dead time 
                    while (t >= (initialTime + effectiveTime) && t < (initialTime + totalTime)){
                        plasmaToDialysateDiffusion[t] = 0;
                        plasmaToDialysateConvection[t] = 0;
                        plasmaToDialysate[t] = 0;
                        volDialysate[t] = deadVolumeDialysate;
                        dialysateConcentration[t] = dialysateConcentration[t - 1];
                        amountDialysate[t] = volDialysate[t - 1] * dialysateConcentration[t - 1] / 100;

                        volumeofDistribution[t] = volumeofDistribution[t - 1] + volume_intake/1000;
                        plasmaConcentration[t] = ((plasmaConcentration[t - 1] * 10 * volumeofDistribution[t-1]) + netMovtIn[t - 1])/(volumeofDistribution[t] * 10);
                        amountBody[t] = amountBody[t - 1] * netMovtIn [t - 1];
                        excretion[t] = plasmaConcentration[t] * kru / 100;
                        netMovtIn[t] = gen - excretion[t] - plasmaToDialysate[t];

                        t += 1;
                    }
                }
            }

            // let's say monday is not selected, need to initialize time stamp 0
            if (day == 0 && !days.includes(daysOfWeek[day])){
                plasmaConcentration[t] = initial_Concentration;
                volumeofDistribution[t] = volume;

                plasmaToDialysateDiffusion[t] = 0;
                plasmaToDialysateConvection[t] = 0;
                plasmaToDialysate[t] = 0;

                volDialysate[t] = deadVolumeDialysate;
                amountDialysate[t] = volDialysate[t] / 100 * plasmaConcentration[t];
                dialysateConcentration[t] = amountDialysate[t] / volDialysate[t] * 100;
        
                amountBody[t] = plasmaConcentration[t] * volume * 10;
                excretion[t] = plasmaConcentration[t] * kru / 100;
                netMovtIn[t] = gen - excretion[t] - plasmaToDialysate[t];

                t += 1;
            }

            while (t < (day + 1) * (24 * 60)){
                plasmaToDialysateDiffusion[t] = 0;
                plasmaToDialysateConvection[t] = 0;
                plasmaToDialysate[t] = 0;
                volDialysate[t] = deadVolumeDialysate;
                dialysateConcentration[t] = dialysateConcentration[t - 1];
                amountDialysate[t] = volDialysate[t - 1] * dialysateConcentration[t - 1] / 100;

                volumeofDistribution[t] = volumeofDistribution[t - 1] + volume_intake/1000;
                plasmaConcentration[t] = ((plasmaConcentration[t - 1] * 10 * volumeofDistribution[t-1]) + netMovtIn[t - 1])/(volumeofDistribution[t] * 10);
                amountBody[t] = amountBody[t - 1] * netMovtIn [t - 1];
                excretion[t] = plasmaConcentration[t] * kru / 100;
                netMovtIn[t] = gen - excretion[t] - plasmaToDialysate[t];

                t += 1;
            }
        }

        if (Math.abs(plasmaConcentration[t - 1] - initial_Concentration) < (initial_equilibrium_tolerance * initial_Concentration)){
            initial_steady_state = 1;
        }
        else{
            initial_Concentration = plasmaConcentration[t - 1];
            t = 0;
            peak_index = 0;
        }
    } 

    if (iterCount >= max_iter) {
        console.warn("pdCalculator: reached maximum iterations without converging");
    }
   
    return {
        plasmaConcentration,
        volumeofDistribution,
        peakConcentration,
        dialysateConcentration,
        volDialysate,
        gen,
        plasmaToDialysate,
        excretion
    };
                      
}


function updateNumerical(treatment, plasmaConcentration, peakConcentration, gen, plasmaToDialysate, kru, volume, solute, excretion) {
    const suffix = `Tx${treatment}`;

    if (plasmaConcentration.length === 0) avg = 0; // Handle empty array case

    var sumOfPlasmaConc = plasmaConcentration.reduce((plasmaConcentration, value) => plasmaConcentration + value, 0);
    var avg = sumOfPlasmaConc / plasmaConcentration.length;

    document.getElementById(`avgConc${suffix}`).innerText = avg.toFixed(2);

    if (peakConcentration.length === 0) avg = 0; // Handle empty array case

    var sum = peakConcentration.reduce((peakConcentration, value) => peakConcentration + value, 0);    
    var avgPeak = sum / peakConcentration.length; 

    var effClearAvg = gen / avg * 100;
    var effClearPeak = gen / avgPeak * 100;

    document.getElementById(`avgClr${suffix}`).innerText = effClearAvg.toFixed(2);
    document.getElementById(`peakClr${suffix}`).innerText = effClearPeak.toFixed(2);

    var sumOfPlasmaDialysate = plasmaToDialysate.reduce((plasmaToDialysate, value) => plasmaToDialysate + value, 0);
    var sumOfExcretion = excretion.reduce((excretion, value) => excretion + value, 0);

    var dialysateClearance = sumOfPlasmaDialysate / sumOfPlasmaConc * 100;

    document.getElementById(`avgClrDial${suffix}`).innerText = dialysateClearance.toFixed(2);
    document.getElementById(`avgClrKid${suffix}`).innerText = kru.toFixed(2);

    var ktv = 0;
    let ktvArray = new Array(7).fill(0);

    if (solute == "urea"){
        var tacPlasma = avgPeak / 1.08;
        var weeklyRemoval = sumOfPlasmaDialysate + sumOfExcretion;
        ktv = tacPlasma > 0 ? (weeklyRemoval / 10080) / (tacPlasma / 100) : 0;
        ktvArray = ktVTable(plasmaConcentration, plasmaToDialysate, excretion, tacPlasma);
    }
    document.getElementById(`ktv${suffix}`).innerText = ktv.toFixed(2);
    
    const days = ['one', 'two', 'three', 'four', 'five', 'six', 'seven'];
    days.forEach((day, i) => {
        const cell = document.getElementById(`day${day}${suffix}`);
        if (cell) {
            cell.innerText = ktvArray[i].toFixed(2);
        }
    });

    // Format volume and generation values to 2 decimal places
    document.getElementById('volume').value = parseFloat(volume).toFixed(2);
    document.getElementById('gen').value = parseFloat(gen).toFixed(2);
}


function ktVTable(plasmaConcentration, plasmaToDialysate, excretion, tacPlasma) {
    const MIN_PER_DAY = 1440;
    const middayIdx = [9360, 7920, 6480, 5040, 3600, 2160, 720];

    return middayIdx.map((_, day) => {
        const start = day * MIN_PER_DAY;           // day block start
        const end   = start + MIN_PER_DAY;         // day block end (exclusive)
  
        let sumPlasmaRemoved = 0;
  
        for (let i = start; i < end; i++) {
          sumPlasmaRemoved += plasmaToDialysate[i] + excretion[i]|| 0 ;
        }
        
        const avgRemovalPerMin = sumPlasmaRemoved / MIN_PER_DAY;
        return tacPlasma > 0 ? avgRemovalPerMin / (tacPlasma / 100) : 0;
    });
}

function redrawBothLines() {
    console.log("→ treatments:", treatments);
    const selectedVar = document.querySelector('input[name="variable"]:checked').value;
    const zoomRadio   = document.querySelector('input[name="zoom"]:checked').value;
    const avgRadio    = document.querySelector('input[name="add"]:checked').value;
  
    const zoomVal = zoomRadio === "Zoomed Out" ? 0 : 'auto';
    const showAvg = avgRadio === "Include Avg";
  
    let array1, array2, yLabel;
    switch (selectedVar) {
      case "Plasma Concentration":
        array1 = treatments.treatment1?.plasmaConcentration;
        array2 = treatments.treatment2?.plasmaConcentration;
        yLabel = "PUN (mg/L)";
        break;
      case "Volume of Distribution":
        array1 = treatments.treatment1?.volumeofDistribution;
        array2 = treatments.treatment2?.volumeofDistribution;
        yLabel = "Volume of Distribution (L)";
        break;
      case "Dialysate Concentration":
        array1 = treatments.treatment1?.dialysateConcentration;
        array2 = treatments.treatment2?.dialysateConcentration;
        yLabel = "Dialysate Concentration (mg/L)";
        break;
      case "Dialysate Volume":
        array1 = treatments.treatment1?.volDialysate;
        array2 = treatments.treatment2?.volDialysate;
        yLabel = "Dialysate Volume (mL)";
        break;
      default:
        return; // no-op if somehow nothing matches
    }
  
    const datasets = [];
  
    function pushSeries(key, dataArr, label, color, colorAverage) {
        // find the corresponding checkbox
        const box = document.querySelector(
          `#series-selector input[data-series="${key}"]`
        );
        if (!box.checked || !Array.isArray(dataArr) || dataArr.length === 0) return;
      
        // main line
        datasets.push({
          label,
          data: dataArr.map((y,i) => ({ x: i, y })),
          borderColor: color,
          fill: false
        });
      
        // dotted average
        if (showAvg) {
          const avg = dataArr.reduce((s,v)=>s+v,0)/dataArr.length;
          datasets.push({
            label: label + ' Avg',
            data: dataArr.map((_,i)=>({ x: i, y: avg })),
            borderDash: [2,2],
            borderWidth: 1,
            borderColor: colorAverage,
            fill: false
          });
        }
      }
    
    pushSeries("treatment1", array1, "Treatment 1", "#2A9D8F", "#6D454C");
    pushSeries("treatment2", array2, "Treatment 2", "#E76F51", "#1C2541");
    
    console.log("datasets", datasets);
    const existing = Chart.getChart("chartCanvas");
    if (existing) existing.destroy();
  
    const ctx = document.getElementById('chartCanvas').getContext('2d');
    const useHorizontalPunLabel = selectedVar === "Plasma Concentration";
    new Chart(ctx, {
      type: 'line',
      data: { datasets },
      options: {
        scales: {
          x: {
            type: 'linear',
            title: { display: true, text: 'Time (minutes)' },
            min: 0,
            max: 10080,
            ticks: { stepSize: 1440 }
          },
          y: {
            title: {
              display: true,
              text: yLabel,
              rotation: 0
            },
            min: zoomVal
          }
        },
        plugins: {
          legend: {
            labels: {
              font: { family: 'Manrope', size: 15 }
            }
          }
        }
      },
      plugins: []
    });
  }


async function handleTreatmentToggle(seriesKey) {
    // Toggle treatment2-selected class on body
    if (seriesKey === 'treatment2') {
        document.body.classList.add('treatment2-selected');
    } else {
        document.body.classList.remove('treatment2-selected');
    }

    const inputs = gatherFormInputs();
    savedInputs[seriesKey] = { ...inputs };

    console.log("SAVED INPUTS")
    console.log(inputs);
    
    const {
        plasmaConcentration,
        volumeofDistribution,
        peakConcentration,
        dialysateConcentration,
        volDialysate,
        gen,
        plasmaToDialysate,
        excretion
    } = await pdCalculator(
        inputs.kru,
        inputs.solute,
        inputs.mtac,
        inputs.volume,
        inputs.pna,
        inputs.m_fluid_removal,
        inputs.a_fluid_removal,
        inputs.volumeData,
        inputs.timeData,
        inputs.schemeData,
        inputs.days,
        inputs.totATime,
        inputs.totMTime,
        inputs.totalExchangeTime,
        inputs.gen
    );

    treatments[seriesKey] = {
        plasmaConcentration,
        volumeofDistribution,
        dialysateConcentration,
        volDialysate,
        plasmaToDialysate
    };

    redrawBothLines();

    const treatmentNum = seriesKey === "treatment1" ? 1 : 2;
    updateNumerical(treatmentNum, plasmaConcentration, peakConcentration, gen, plasmaToDialysate, inputs.kru, inputs.volume, inputs.solute, excretion);
    
    // Update headers for the current treatment
    updateHeaders(seriesKey);

    // Automatically select the corresponding radio button
    const radioButton = document.querySelector(`input[name="displayTreatmentInfo"][value="${seriesKey}"]`);
    if (radioButton) {
        radioButton.checked = true;
        // Trigger the change event to update the display
        radioButton.dispatchEvent(new Event('change'));
    }
}

function updateHeaders(treatmentKey) {
    const treatmentNum = treatmentKey === 'treatment1' ? '1' : '2';
    
    // Get all h2 elements
    const headers = document.querySelectorAll('h2');
    
    // Update each header based on its current text
    headers.forEach(header => {
        const currentText = header.textContent.trim();
        if (currentText === 'Daily Exchange' || currentText.startsWith('Daily Exchange for Treatment')) {
            header.textContent = `Daily Exchange for Treatment ${treatmentNum}`;
        } else if (currentText === 'Fluid Removal' || currentText.startsWith('Fluid Removal for Treatment')) {
            header.textContent = `Fluid Removal for Treatment ${treatmentNum}`;
        } else if (currentText === 'Weekly Calendar' || currentText.startsWith('Weekly Calendar for Treatment')) {
            header.textContent = `Weekly Calendar for Treatment ${treatmentNum}`;
        }
    });
}

function showDisclaimer() {
    const modal = document.getElementById('disclaimerModal');
    modal.style.display = 'block';
    const btn = document.getElementById('acceptDisclaimer');
    // Remove any previous event listeners to avoid stacking
    btn.onclick = function() {
        modal.style.display = 'none';
    };
}