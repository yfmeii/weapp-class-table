const defaultClassTableSettings = {
  showWeekend: false,
  showOtherWeek: false,
  cellHeight: 120,
  maxSection: 11,
  background: {
    url: '',
    opacity: 1,
    blur: 0,
  },
}

const defaultWeekdays = ['一', '二', '三', '四', '五', '六', '日']
const classTableColorCount = 41

function resolveClassTableSettings(settings) {
  const incomingSettings = settings || {}

  return {
    ...defaultClassTableSettings,
    ...incomingSettings,
    background: {
      ...defaultClassTableSettings.background,
      ...(incomingSettings.background || {}),
    },
  }
}

function getCourseName(course) {
  return course.courseName || course.course || ''
}

function getCourseIdentifier(course, courseIndex) {
  return course.id || course.rowId || `course-${courseIndex}`
}

function getSortedSections(course) {
  if (!Array.isArray(course.sections)) {
    return []
  }

  return course.sections
    .filter(sectionItem => sectionItem && Number(sectionItem.section) > 0)
    .map(sectionItem => ({
      ...sectionItem,
      section: Number(sectionItem.section),
    }))
    .sort((firstSection, secondSection) => firstSection.section - secondSection.section)
}

function createClassTableRenderData(options) {
  const renderOptions = options || {}
  const courses = Array.isArray(renderOptions.courses) ? renderOptions.courses : []
  const currentWeek = Number(renderOptions.currentWeek || 1)
  const settings = resolveClassTableSettings(renderOptions.settings)
  const colorMap = {}
  const occupiedCellIndexes = []
  let maxSection = Number(settings.maxSection || defaultClassTableSettings.maxSection)

  const normalizedCourses = courses
    .map((course, courseIndex) => {
      const sortedSections = getSortedSections(course)

      if (sortedSections.length === 0) {
        return null
      }

      sortedSections.forEach(sectionItem => {
        if (sectionItem.section > maxSection) {
          maxSection = sectionItem.section
        }
      })

      const courseName = getCourseName(course)
      const courseWeeks = Array.isArray(course.weeks) ? course.weeks.map(Number) : []
      const isCurrentWeek = courseWeeks.includes(currentWeek)

      if (isCurrentWeek && !colorMap[courseName]) {
        const rawColorIndex = Object.keys(colorMap).length + 1
        colorMap[courseName] = ((rawColorIndex - 1) % classTableColorCount) + 1
      }

      return {
        ...course,
        id: getCourseIdentifier(course, courseIndex),
        courseName,
        place: course.place || '',
        teacher: course.teacher || '',
        weekday: Number(course.weekday || 0),
        sections: sortedSections,
        color: isCurrentWeek ? colorMap[courseName] : 0,
        zIndex: isCurrentWeek ? 30 - sortedSections.length : 0,
        isCurrentWeek,
      }
    })
    .filter(Boolean)

  const visibleCourses = settings.showOtherWeek
    ? normalizedCourses
    : normalizedCourses.filter(course => course.isCurrentWeek)

  const renderData = visibleCourses.map(course => {
    const firstSection = course.sections[0]
    const cellIndex = `${course.weekday}-${firstSection.section}`
    const hasSameCell = occupiedCellIndexes.includes(cellIndex)

    if (!hasSameCell) {
      occupiedCellIndexes.push(cellIndex)
    }

    return {
      ...course,
      cellIndex,
      hasSameCell,
    }
  })

  return {
    renderData,
    maxSection,
    hasWeekend: renderData.some(course => course.weekday > 5),
    settings,
  }
}

function getDateByWeekday(termStartDate, currentWeek, weekday) {
  const date = new Date(termStartDate)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  const offsetDays = (Number(currentWeek || 1) - 1) * 7 + (weekday - 1)
  date.setDate(date.getDate() + offsetDays)
  return date
}

function formatDateKey(date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')

  return `${year}-${month}-${day}`
}

function createDateHeader(termStartDate, currentWeek) {
  if (!termStartDate) {
    return {
      days: [],
      month: 0,
      todayIndex: -1,
    }
  }

  const firstDayOfWeek = getDateByWeekday(termStartDate, currentWeek, 1)

  if (!firstDayOfWeek) {
    return {
      days: [],
      month: 0,
      todayIndex: -1,
    }
  }

  const todayDateKey = formatDateKey(new Date())
  const days = []
  let todayIndex = -1

  for (let weekday = 1; weekday <= 7; weekday += 1) {
    const date = getDateByWeekday(termStartDate, currentWeek, weekday)
    days.push(date.getDate())

    if (formatDateKey(date) === todayDateKey) {
      todayIndex = weekday - 1
    }
  }

  return {
    days,
    month: firstDayOfWeek.getMonth() + 1,
    todayIndex,
  }
}

function createSectionTimes(sectionTimes, maxSection) {
  const normalizedSectionTimes = {}
  const incomingSectionTimes = sectionTimes || {}

  for (let sectionIndex = 1; sectionIndex <= maxSection; sectionIndex += 1) {
    const sectionTime = incomingSectionTimes[sectionIndex] || []

    normalizedSectionTimes[sectionIndex] = {
      start: sectionTime[0] || '',
      end: sectionTime[1] || '',
    }
  }

  return normalizedSectionTimes
}

function createBackgroundStyle(background) {
  const backgroundOptions = background || {}
  const styleParts = []

  if (backgroundOptions.opacity !== undefined && backgroundOptions.opacity !== '') {
    styleParts.push(`opacity: ${backgroundOptions.opacity};`)
  }

  if (backgroundOptions.blur) {
    styleParts.push(`filter: blur(${backgroundOptions.blur}rpx);`)
  }

  return styleParts.join(' ')
}

Component({
  properties: {
    courses: {
      type: Array,
      value: [],
    },
    currentWeek: {
      type: Number,
      value: 1,
    },
    termStartDate: {
      type: String,
      value: '',
    },
    sectionTimes: {
      type: Object,
      value: {},
    },
    settings: {
      type: Object,
      value: {},
    },
  },

  data: {
    weekdays: defaultWeekdays,
    renderData: [],
    maxSection: defaultClassTableSettings.maxSection,
    days: [],
    month: 0,
    todayIndex: -1,
    resolvedSettings: defaultClassTableSettings,
    resolvedSectionTimes: {},
    backgroundStyle: '',
  },

  lifetimes: {
    attached() {
      this.renderClassTable()
      this.updateDateHeader()
      this.triggerEvent('ready')
    },
  },

  observers: {
    'courses, currentWeek, settings, sectionTimes': function() {
      this.renderClassTable()
    },
    'termStartDate, currentWeek': function() {
      this.updateDateHeader()
    },
  },

  methods: {
    handleCourseTap(event) {
      const course = event.currentTarget.dataset.info
      const cellIndex = course.cellIndex
      const coursesInSameCell = this.data.renderData
        .filter(renderedCourse => renderedCourse.cellIndex === cellIndex)
        .sort((firstCourse, secondCourse) => secondCourse.zIndex - firstCourse.zIndex)

      this.triggerEvent('courseTap', {
        course,
        courses: coursesInSameCell,
        cellIndex,
      })
    },

    renderClassTable() {
      const result = createClassTableRenderData({
        courses: this.data.courses,
        currentWeek: this.data.currentWeek,
        settings: this.data.settings,
      })

      const resolvedSectionTimes = createSectionTimes(this.data.sectionTimes, result.maxSection)
      const backgroundStyle = createBackgroundStyle(result.settings.background)

      this.setData({
        renderData: result.renderData,
        maxSection: result.maxSection,
        resolvedSettings: result.settings,
        resolvedSectionTimes,
        backgroundStyle,
      })

      if (result.hasWeekend && !result.settings.showWeekend) {
        this.triggerEvent('weekendDetected', {
          hasWeekend: true,
        })
      }
    },

    updateDateHeader() {
      const dateHeader = createDateHeader(this.data.termStartDate, this.data.currentWeek)

      this.setData({
        days: dateHeader.days,
        month: dateHeader.month,
        todayIndex: dateHeader.todayIndex,
      })
    },
  },
})
