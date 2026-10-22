/**
 * Tamil IPTV - Electronic Program Guide (EPG) Engine
 * Calculates real-time Now Playing, Up Next, and complete daily schedule timeline.
 */

const EPGManager = {
  // Convert "HH:MM" to minutes from midnight
  timeToMinutes(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  },

  // Format minutes from midnight to "HH:MM AM/PM"
  minutesToTimeStr(mins) {
    const normMins = ((mins % 1440) + 1440) % 1440;
    let h = Math.floor(normMins / 60);
    const m = normMins % 60;
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${ampm}`;
  },

  // Get current program and upcoming program for a channel
  getCurrentProgram(channel, referenceDate = new Date()) {
    if (!channel) return null;

    const currentMinutes = referenceDate.getHours() * 60 + referenceDate.getMinutes();
    const currentSeconds = referenceDate.getSeconds();
    const schedule = channel.epgSchedule;

    // If channel has no custom schedule, create a realistic 24h continuous broadcast schedule
    if (!schedule || schedule.length === 0) {
      return {
        now: {
          title: `${channel.name} (24/7 Live Broadcast)`,
          desc: channel.description || "Continuous 24-hour high-definition live telecast.",
          startTime: "12:00 AM",
          endTime: "11:59 PM",
          elapsedMinutes: currentMinutes,
          duration: 1440,
          progress: Math.min(100, Math.floor((currentMinutes / 1440) * 100)),
          remainingMinutes: 1440 - currentMinutes
        },
        next: {
          title: `${channel.name} (Non-Stop Telecast)`,
          desc: "Next continuous transmission and special programming.",
          startTime: "Tomorrow 12:00 AM"
        }
      };
    }

    // Sort schedule chronologically
    const sorted = [...schedule].sort((a, b) => this.timeToMinutes(a.start) - this.timeToMinutes(b.start));

    let activeIndex = -1;

    for (let i = 0; i < sorted.length; i++) {
      const prog = sorted[i];
      const startMins = this.timeToMinutes(prog.start);
      const endMins = startMins + prog.duration;

      if (currentMinutes >= startMins && currentMinutes < endMins) {
        activeIndex = i;
        break;
      }
    }

    // Handle wrap around midnight if program started late night
    if (activeIndex === -1) {
      const lastProg = sorted[sorted.length - 1];
      const lastStart = this.timeToMinutes(lastProg.start);
      const lastEnd = lastStart + lastProg.duration;

      if (lastEnd > 1440 && currentMinutes < (lastEnd - 1440)) {
        activeIndex = sorted.length - 1;
      } else {
        // Fallback to closest program
        activeIndex = 0;
      }
    }

    const currentProg = sorted[activeIndex];
    const nextProg = sorted[(activeIndex + 1) % sorted.length];

    const startMins = this.timeToMinutes(currentProg.start);
    let elapsedMins = currentMinutes >= startMins ? (currentMinutes - startMins) : (1440 - startMins + currentMinutes);
    const duration = currentProg.duration || 60;
    elapsedMins = Math.min(duration, Math.max(0, elapsedMins));
    const remainingMins = Math.max(1, duration - elapsedMins);
    const progress = Math.min(100, Math.max(2, Math.floor(((elapsedMins * 60 + currentSeconds) / (duration * 60)) * 100)));

    const endMins = (startMins + duration) % 1440;

    return {
      now: {
        title: currentProg.title,
        desc: currentProg.desc,
        startTime: this.minutesToTimeStr(startMins),
        endTime: this.minutesToTimeStr(endMins),
        elapsedMinutes: elapsedMins,
        duration: duration,
        progress: progress,
        remainingMinutes: remainingMins
      },
      next: {
        title: nextProg.title,
        desc: nextProg.desc,
        startTime: this.minutesToTimeStr(this.timeToMinutes(nextProg.start)),
        duration: nextProg.duration
      }
    };
  },

  // Generate full daily schedule for a channel
  getFullSchedule(channel) {
    if (!channel || !channel.epgSchedule) return [];
    return channel.epgSchedule.map(prog => {
      const startMins = this.timeToMinutes(prog.start);
      const endMins = (startMins + prog.duration) % 1440;
      return {
        ...prog,
        startTime: this.minutesToTimeStr(startMins),
        endTime: this.minutesToTimeStr(endMins)
      };
    });
  }
};
