   /* ---------- POMODORO TIMER ---------- */
    const alarm = new Audio('https://actions.google.com/sounds/v1/alarms/beep_loop.ogg');
    alarm.loop = true; 
    let timerInterval = null;

    document.getElementById('timerBtn').onclick = function() {
      // 1. IF THE ALARM IS CURRENTLY SCREAMING: Stop it.
      if (document.body.classList.contains('flashing-active')) {
        clearInterval(timerInterval);
        alarm.pause();
        alarm.currentTime = 0;
        document.body.classList.remove('flashing-active');
        this.textContent = "⏲ Set Timer";
        this.classList.remove('active');
        return;
      }

      // 2. IF THE TIMER IS ALREADY RUNNING: Reset it.
      if (timerInterval) clearInterval(timerInterval);

      // 3. START THE 25-MINUTE LOCK
      let seconds = 25 * 60; 
      this.classList.add('active');
      
      timerInterval = setInterval(() => {
        seconds--;
        
        // Update button text to show live countdown
        let mins = Math.floor(seconds / 60);
        let secs = seconds % 60;
        this.textContent = `⏳ ${mins}:${secs.toString().padStart(2, '0')}`;

        if (seconds <= 0) {
          clearInterval(timerInterval);
          alarm.play(); // Start the infinite loop
          document.body.classList.add('flashing-active'); // Start the red strobe
          this.textContent = "⚠️ STOP ALARM";
        }
      }, 1000);
    };
