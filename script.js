document.addEventListener('DOMContentLoaded', () => {
    const createWorkoutBtn = document.getElementById('createWorkoutBtn');
    const workoutsContainer = document.getElementById('workoutsContainer');
    const overlay = document.getElementById('overlay');
    const currentWorkoutName = document.getElementById('currentWorkoutName');
    const currentExerciseName = document.getElementById('currentExerciseName');
    const timer = document.getElementById('timer');
    const exitWorkoutBtn = document.getElementById('exitWorkoutBtn');
    const pauseWorkoutBtn = document.createElement('button');
    pauseWorkoutBtn.textContent = 'Pause';
    pauseWorkoutBtn.id = 'pauseWorkoutBtn';

    let workouts = [];
    let intervalId;
    let paused = false;
    let remainingTime;
    let currentCallback;

    const audioContext = new (window.AudioContext || window.webkitAudioContext)();

    function beep(times) {
        for (let i = 0; i < times; i++) {
            setTimeout(() => {
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                oscillator.frequency.value = 1000;
                oscillator.type = 'sine';
                oscillator.start();
                gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.5);
                oscillator.stop(audioContext.currentTime + 0.5);
            }, i * 300);
        }
    }

    function saveWorkouts() {
        localStorage.setItem('workouts', JSON.stringify(workouts));
    }

    function loadWorkouts() {
        const savedWorkouts = localStorage.getItem('workouts');
        if (savedWorkouts) {
            workouts = JSON.parse(savedWorkouts);
            renderWorkouts();
        }
    }

    createWorkoutBtn.addEventListener('click', () => {
        const workoutName = prompt('Enter workout name:');
        if (workoutName) {
            const workout = {
                name: workoutName,
                exercises: []
            };
            workouts.push(workout);
            renderWorkouts();
            saveWorkouts();
        }
    });

    function renderWorkouts() {
        workoutsContainer.innerHTML = '';
        workouts.forEach((workout, workoutIndex) => {
            const workoutDiv = document.createElement('div');
            workoutDiv.classList.add('workout');

            const workoutHeader = document.createElement('div');
            workoutHeader.classList.add('workout-header');
            workoutHeader.innerHTML = `
                <h2>${workout.name}</h2>
                <button onclick="toggleWorkout(${workoutIndex})">Toggle</button>
                <button onclick="startWorkout(${workoutIndex})">Play</button>
                <button onclick="editWorkout(${workoutIndex})">Edit</button>
                <button onclick="deleteWorkout(${workoutIndex})">Delete</button>
                <button onclick="addExercise(${workoutIndex})">Add Exercise</button>
            `;
            workoutDiv.appendChild(workoutHeader);

            const exercisesDiv = document.createElement('div');
            exercisesDiv.classList.add('exercises');
            exercisesDiv.style.display = 'none';
            workout.exercises.forEach((exercise, exerciseIndex) => {
                const exerciseDiv = document.createElement('div');
                exerciseDiv.classList.add('exercise');
                exerciseDiv.innerHTML = `
                    <p>Name: ${exercise.name}</p>
                    <p>Preparation Time: ${exercise.preparationTime}</p>
                    <p>Exercise Time: ${exercise.exerciseTime}</p>
                    <p>Rest Time: ${exercise.restTime}</p>
                    <p>Cycles: ${exercise.cycles}</p>
                    <button onclick="editExercise(${workoutIndex}, ${exerciseIndex})">Edit</button>
                    <button onclick="deleteExercise(${workoutIndex}, ${exerciseIndex})">Delete</button>
                `;
                exercisesDiv.appendChild(exerciseDiv);
            });
            workoutDiv.appendChild(exercisesDiv);

            workoutsContainer.appendChild(workoutDiv);
        });
    }

    window.toggleWorkout = (workoutIndex) => {
        const exercisesDiv = workoutsContainer.children[workoutIndex].querySelector('.exercises');
        if (exercisesDiv.style.display === 'none') {
            exercisesDiv.style.display = 'block';
            exercisesDiv.style.background = '#fd00ff36';
            exercisesDiv.style.margin = '2% 5%';
        } else {
            exercisesDiv.style.display = 'none';
        }
    };

    window.addExercise = (workoutIndex) => {
        const exerciseName = prompt('Enter exercise name:');
        const preparationTime = parseInt(prompt('Enter preparation time (in seconds):'), 10);
        const exerciseTime = parseInt(prompt('Enter exercise time (in seconds):'), 10);
        const restTime = parseInt(prompt('Enter rest time (in seconds):'), 10);
        const cycles = parseInt(prompt('Enter number of cycles:'), 10);

        if (exerciseName && !isNaN(preparationTime) && !isNaN(exerciseTime) && !isNaN(restTime) && !isNaN(cycles)) {
            const exercise = {
                name: exerciseName,
                preparationTime,
                exerciseTime,
                restTime,
                cycles
            };
            workouts[workoutIndex].exercises.push(exercise);
            renderWorkouts();
            saveWorkouts();
        }
    };

    window.editWorkout = (workoutIndex) => {
        const workoutName = prompt('Enter new workout name:', workouts[workoutIndex].name);
        if (workoutName) {
            workouts[workoutIndex].name = workoutName;
            renderWorkouts();
            saveWorkouts();
        }
    };

    window.deleteWorkout = (workoutIndex) => {
        if (confirm('Are you sure you want to delete this workout?')) {
            workouts.splice(workoutIndex, 1);
            renderWorkouts();
            saveWorkouts();
        }
    };

    window.editExercise = (workoutIndex, exerciseIndex) => {
        const exercise = workouts[workoutIndex].exercises[exerciseIndex];
        const exerciseName = prompt('Enter new exercise name:', exercise.name);
        const preparationTime = parseInt(prompt('Enter new preparation time (in seconds):', exercise.preparationTime), 10);
        const exerciseTime = parseInt(prompt('Enter new exercise time (in seconds):', exercise.exerciseTime), 10);
        const restTime = parseInt(prompt('Enter new rest time (in seconds):', exercise.restTime), 10);
        const cycles = parseInt(prompt('Enter new number of cycles:', exercise.cycles), 10);

        if (exerciseName && !isNaN(preparationTime) && !isNaN(exerciseTime) && !isNaN(restTime) && !isNaN(cycles)) {
            exercise.name = exerciseName;
            exercise.preparationTime = preparationTime;
            exercise.exerciseTime = exerciseTime;
            exercise.restTime = restTime;
            exercise.cycles = cycles;
            renderWorkouts();
            saveWorkouts();
        }
    };

    window.deleteExercise = (workoutIndex, exerciseIndex) => {
        if (confirm('Are you sure you want to delete this exercise?')) {
            workouts[workoutIndex].exercises.splice(exerciseIndex, 1);
            renderWorkouts();
            saveWorkouts();
        }
    };

    window.startWorkout = (workoutIndex) => {
        const workout = workouts[workoutIndex];
        overlay.style.display = 'flex';
        currentWorkoutName.textContent = workout.name;
        document.querySelector('.overlay-content').appendChild(pauseWorkoutBtn);

        let currentExerciseIndex = 0;
        let currentCycle = 1;
        let currentPhase = 'preparation';

        function updateTimerDisplay(seconds) {
            timer.textContent = seconds;
        }

        function startTimer(duration, callback) {
            remainingTime = duration;
            updateTimerDisplay(remainingTime);
            intervalId = setInterval(() => {
                if (!paused) {
                    remainingTime--;
                    if (remainingTime <= 3 && remainingTime > 0) {
                        beep(1);
                    }
                    if (remainingTime === 0) {
                        beep(3);
                    }
                    updateTimerDisplay(remainingTime);
                    if (remainingTime <= 0) {
                        clearInterval(intervalId);
                        callback();
                    }
                }
            }, 1000);
            currentCallback = callback;
        }

        function nextPhase() {
            const currentExercise = workout.exercises[currentExerciseIndex];
            if (currentPhase === 'preparation') {
                currentExerciseName.textContent = currentExercise.name + ' - Preparation';
                startTimer(currentExercise.preparationTime, () => {
                    currentPhase = 'exercise';
                    nextPhase();
                });
            } else if (currentPhase === 'exercise') {
                currentExerciseName.textContent = currentExercise.name + ' - Exercise';
                startTimer(currentExercise.exerciseTime, () => {
                    currentPhase = 'rest';
                    nextPhase();
                });
            } else if (currentPhase === 'rest') {
                currentExerciseName.textContent = currentExercise.name + ' - Rest';
                startTimer(currentExercise.restTime, () => {
                    if (currentCycle < currentExercise.cycles) {
                        currentCycle++;
                        currentPhase = 'preparation';
                        nextPhase();
                    } else {
                        currentCycle = 1;
                        currentExerciseIndex++;
                        if (currentExerciseIndex < workout.exercises.length) {
                            currentPhase = 'preparation';
                            nextPhase();
                        } else {
                            overlay.style.display = 'none';
                        }
                    }
                });
            }
        }

        nextPhase();
    };

    pauseWorkoutBtn.addEventListener('click', () => {
        paused = !paused;
        pauseWorkoutBtn.textContent = paused ? 'Resume' : 'Pause';
    });

    exitWorkoutBtn.addEventListener('click', () => {
        clearInterval(intervalId);
        overlay.style.display = 'none';
        paused = false;
        pauseWorkoutBtn.textContent = 'Pause';
    });

    function exportWorkouts() {
        const dataStr = JSON.stringify(workouts);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

        const exportFileDefaultName = 'workouts.json';

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    }

    function importWorkouts(event) {
        const file = event.target.files[0];
        const reader = new FileReader();

        reader.onload = (e) => {
            const data = JSON.parse(e.target.result);
            workouts = data;
            renderWorkouts();
            saveWorkouts();
        };

        reader.readAsText(file);
    }

    document.getElementById('exportWorkoutsBtn').addEventListener('click', exportWorkouts);
    document.getElementById('importWorkoutsBtn').addEventListener('click', () => {
        document.getElementById('importWorkoutsInput').click();
    });
    document.getElementById('importWorkoutsInput').addEventListener('change', importWorkouts);

    loadWorkouts();
});
