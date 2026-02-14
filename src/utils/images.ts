import * as ImagePicker from 'expo-image-picker'
import * as ImageManipulator from 'expo-image-manipulator'
import { supabase } from '../lib/supabase'

const MAX_FILE_SIZE_MB = 5
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
const COMPRESSION_QUALITY = 0.7
const MAX_DIMENSION = 1920

export interface ProcessedImage {
  uri: string
  base64: string
  width: number
  height: number
  sizeBytes: number
}

export interface UploadResult {
  success: boolean
  publicUrl?: string
  error?: string
}

/**
 * Picks an image from the device library
 */
export async function pickImage(): Promise<ImagePicker.ImagePickerAsset | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()

  if (!permission.granted) {
    throw new Error('Permission to access media library was denied')
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [16, 9],
    quality: 1,
  })

  if (result.canceled || !result.assets[0]) {
    return null
  }

  return result.assets[0]
}

/**
 * Compresses and resizes an image to meet size requirements
 */
export async function processImageForUpload(
  uri: string
): Promise<ProcessedImage> {
  let processed = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: MAX_DIMENSION } }],
    { compress: COMPRESSION_QUALITY, format: ImageManipulator.SaveFormat.JPEG, base64: true }
  )

  let base64 = processed.base64 || ''
  let sizeBytes = (base64.length * 3) / 4
  let quality = COMPRESSION_QUALITY

  while (sizeBytes > MAX_FILE_SIZE_BYTES && quality > 0.1) {
    quality -= 0.1
    processed = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: MAX_DIMENSION } }],
      { compress: quality, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    )
    base64 = processed.base64 || ''
    sizeBytes = (base64.length * 3) / 4
  }

  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    throw new Error(`Image exceeds ${MAX_FILE_SIZE_MB}MB limit even after compression`)
  }

  return {
    uri: processed.uri,
    base64,
    width: processed.width,
    height: processed.height,
    sizeBytes,
  }
}

/**
 * Uploads a processed image to Supabase storage
 */
export async function uploadImageToStorage(
  processedImage: ProcessedImage,
  bucket: string,
  path: string
): Promise<UploadResult> {
  try {
    const arrayBuffer = Uint8Array.from(atob(processedImage.base64), c => c.charCodeAt(0))

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, arrayBuffer, {
        contentType: 'image/jpeg',
        upsert: true,
      })

    if (uploadError) {
      return { success: false, error: uploadError.message }
    }

    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(path)

    return { success: true, publicUrl: urlData.publicUrl }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    }
  }
}

/**
 * Complete flow: pick, process, and upload an image
 */
export async function pickAndUploadImage(
  bucket: string,
  pathPrefix: string
): Promise<UploadResult> {
  const picked = await pickImage()
  if (!picked) {
    return { success: false, error: 'No image selected' }
  }

  const processed = await processImageForUpload(picked.uri)
  const filename = `${pathPrefix}/${Date.now()}.jpg`

  return uploadImageToStorage(processed, bucket, filename)
}
