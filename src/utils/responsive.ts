import { Dimensions } from 'react-native'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

const guidelineBaseWidth = 375
const guidelineBaseHeight = 812

/**
 * scale: Used for width, margin, padding, etc.
 */
const scale = (size: number) => (SCREEN_WIDTH / guidelineBaseWidth) * size

/**
 * verticalScale: Used for height, line-height, etc.
 */
const verticalScale = (size: number) => (SCREEN_HEIGHT / guidelineBaseHeight) * size

/**
 * moderateScale: Used for font sizes and border radius.
 * The factor (default 0.5) controls how much the size actually scales.
 */
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor

/**
 * Helper to detect if the device is a tablet
 */
const isTablet = SCREEN_WIDTH > 600

export { scale, verticalScale, moderateScale, isTablet, SCREEN_WIDTH, SCREEN_HEIGHT }
