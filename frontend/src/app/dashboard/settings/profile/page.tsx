'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { User, Camera, Mail, Phone, Globe, DollarSign, Upload, FileText } from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { toast } from 'sonner'
import { authApi, authApiClient, financeApiClient } from '@/lib/api'
import { getErrorMessage } from '@/lib/error-utils'

export default function ProfilePage() {
  const user = useAuthStore((state) => state.user)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [importingStatement, setImportingStatement] = useState(false)
  const [profileData, setProfileData] = useState({
    full_name: user?.full_name || '',
    phone: user?.phone || '',
    preferred_currency: user?.preferred_currency || 'INR',
    preferred_language: user?.preferred_language || 'en'
  })
  const [profileImage, setProfileImage] = useState<string | null>(null)

  const handleUpdateProfile = async () => {
    setLoading(true)
    try {
      const response = await authApiClient.put('/profile', profileData)
      toast.success('Profile updated successfully!')
      
      // Update zustand store
      const authStore = useAuthStore.getState()
      authStore.setAuth(response.data.user, authStore.token!)
    } catch (error: any) {
      toast.error(getErrorMessage(error) || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    setUploading(true)
    try {
      const response = await authApiClient.post('/profile/upload-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      
      setProfileImage(response.data.image_url)
      toast.success('Profile image uploaded successfully!')
    } catch (error: any) {
      toast.error(getErrorMessage(error) || 'Failed to upload image')
    } finally {
      setUploading(false)
    }
  }

  const handleBankStatementUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file')
      return
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('currency', profileData.preferred_currency)

    setImportingStatement(true)
    try {
      const response = await financeApiClient.post('/import/bank-statement', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      
      toast.success(`Imported ${response.data.imported_count} transactions from ${response.data.total_transactions} total`)
    } catch (error: any) {
      toast.error(getErrorMessage(error) || 'Failed to import bank statement')
    } finally {
      setImportingStatement(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Profile Settings</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Update your personal details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Profile Image */}
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-4xl font-bold shadow-lg">
                  {profileImage ? (
                    <img src={profileImage} alt="Profile" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    user?.full_name?.charAt(0).toUpperCase() || 'U'
                  )}
                </div>
                <label htmlFor="image-upload" className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <Camera className="h-5 w-5 text-gray-600" />
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={uploading}
                  />
                </label>
              </div>
              {uploading && <p className="text-sm text-muted-foreground">Uploading...</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="full_name"
                  className="pl-10"
                  value={profileData.full_name}
                  onChange={(e) => setProfileData({...profileData, full_name: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  className="pl-10"
                  value={user?.email || ''}
                  disabled
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  className="pl-10"
                  placeholder="+91 1234567890"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                />
              </div>
            </div>

            <Button 
              onClick={handleUpdateProfile} 
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Updating...' : 'Update Profile'}
            </Button>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
            <CardDescription>Customize your experience</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currency">Preferred Currency</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <select
                  id="currency"
                  className="w-full pl-10 p-2 border rounded-md"
                  value={profileData.preferred_currency}
                  onChange={(e) => setProfileData({...profileData, preferred_currency: e.target.value})}
                >
                  <option value="INR">INR (₹) - Indian Rupee</option>
                  <option value="USD">USD ($) - US Dollar</option>
                  <option value="EUR">EUR (€) - Euro</option>
                  <option value="GBP">GBP (£) - British Pound</option>
                  <option value="JPY">JPY (¥) - Japanese Yen</option>
                  <option value="AUD">AUD (A$) - Australian Dollar</option>
                  <option value="CAD">CAD (C$) - Canadian Dollar</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <select
                  id="language"
                  className="w-full pl-10 p-2 border rounded-md"
                  value={profileData.preferred_language}
                  onChange={(e) => setProfileData({...profileData, preferred_language: e.target.value})}
                >
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                </select>
              </div>
            </div>

            {/* Bank Statement Import */}
            <div className="pt-4 border-t">
              <Label className="text-base font-semibold mb-2 block">Import Bank Statement</Label>
              <p className="text-sm text-muted-foreground mb-4">
                Upload your bank statement CSV to automatically import transactions
              </p>
              <label htmlFor="statement-upload" className="w-full">
                <div className="flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                  {importingStatement ? (
                    <span className="text-sm">Importing...</span>
                  ) : (
                    <>
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm font-medium">Upload CSV File</span>
                    </>
                  )}
                </div>
                <input
                  id="statement-upload"
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleBankStatementUpload}
                  disabled={importingStatement}
                />
              </label>
              <p className="text-xs text-muted-foreground mt-2">
                Supports CSV files from most Indian banks (HDFC, ICICI, SBI, etc.)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Account Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Account Overview</CardTitle>
          <CardDescription>Your account at a glance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-muted-foreground">Member Since</p>
              <p className="text-xl font-bold text-blue-600">
                {new Date(user?.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-muted-foreground">Role</p>
              <p className="text-xl font-bold text-green-600 capitalize">{user?.role || 'User'}</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-muted-foreground">Currency</p>
              <p className="text-xl font-bold text-purple-600">{profileData.preferred_currency}</p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <p className="text-sm text-muted-foreground">Language</p>
              <p className="text-xl font-bold text-orange-600 uppercase">{profileData.preferred_language}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
