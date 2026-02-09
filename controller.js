// Calculate Volume of Distribution of Urea using Watson et al. formulas
function calculateVolume() {
    const age = parseFloat(document.getElementById('age').value);
    const height = parseFloat(document.getElementById('height').value);
    const weight = parseFloat(document.getElementById('weight').value);
    const sex = document.getElementById('sex').value;
    const volumeInput = document.getElementById('volume');
    
    // Check if all required fields are filled
    if (!age || !height || !weight || !sex) {
        volumeInput.value = '';
        return;
    }
    
    let volume;
    if (sex === 'male') {
        // Male Volume: 2.447 - (0.09156 * age) + (0.1074 * height) + (0.3362 * weight)
        volume = 2.447 - (0.09156 * age) + (0.1074 * height) + (0.3362 * weight);
    } else if (sex === 'female') {
        // Female Volume: -2.097 + (0.1069 * height) + (0.2466 * weight)
        volume = -2.097 + (0.1069 * height) + (0.2466 * weight);
    }
    
    // Display volume rounded to 2 decimal places
    if (volume !== undefined) {
        volumeInput.value = volume.toFixed(2);
    }
}

// Add event listeners to all inputs that affect volume calculation
document.getElementById('age').addEventListener('input', calculateVolume);
document.getElementById('height').addEventListener('input', calculateVolume);
document.getElementById('weight').addEventListener('input', calculateVolume);
document.getElementById('sex').addEventListener('change', calculateVolume);
