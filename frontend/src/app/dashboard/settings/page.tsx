'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { User, Mail, Phone, Globe, DollarSign, Bell, Shield, Database, Camera, Palette, Tag, Plus, Edit, Trash2, X, Folder, Utensils, Car, ShoppingBag, Home, Heart, Film, Briefcase, TrendingUp, Gift, MoreHorizontal } from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { toast } from 'sonner'
import { authApi, authApiClient, categoryApi, Category } from '@/lib/api'
import { useRouter } from 'next/navigation'
import { getErrorMessage } from '@/lib/error-utils'
import { getCategoryIcon } from '@/lib/category-icons'
import { getCategoryColor } from '@/lib/category-colors'
import { cn } from '@/lib/utils'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ThemeToggleSettings } from '@/components/ui/theme-toggle'
import { ConfirmDialog } from '@/components/ui/alert-dialog'
import Link from 'next/link'

export default function SettingsPage() {
  const user = useAuthStore((state) => state.user)
  const setAuth = useAuthStore((state) => state.setAuth)
  const clearAuth = useAuthStore((state) => state.clearAuth)
  const token = useAuthStore((state) => state.token)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')
  const [uploading, setUploading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [passwordData, setPasswordData] = useState({ current: '', newPass: '', confirm: '' })
  const [notifPrefs, setNotifPrefs] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('notification_prefs')
      return saved ? JSON.parse(saved) : { email: true, budget: true, expense: false, investment: true }
    }
    return { email: true, budget: true, expense: false, investment: true }
  })
  const [passwordError, setPasswordError] = useState('')
  const [profileImage, setProfileImage] = useState<string | null>(user?.profile_image_url || null)
  const [profileData, setProfileData] = useState({
    full_name: user?.full_name || '',
    phone: user?.phone || '',
    preferred_currency: user?.preferred_currency || 'INR',
    preferred_language: user?.preferred_language || 'en'
  })

  // Category management state
  const [categories, setCategories] = useState<Category[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(false)
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    type: 'expense',
    color: '#3B82F6',
    icon: 'folder'
  })

  const handleUpdateProfile = async () => {
    setLoading(true)
    try {
      const response = await authApiClient.put('/profile', profileData)
      toast.success('Profile updated successfully!')
      
      if (response.data.user && token) {
        setAuth(response.data.user, token)
      }
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

  const handleChangePassword = async () => {
    setPasswordError('')
    if (!passwordData.current || !passwordData.newPass || !passwordData.confirm) {
      setPasswordError('All fields are required')
      return
    }
    if (passwordData.newPass.length < 8) {
      setPasswordError('New password must be at least 8 characters')
      return
    }
    if (passwordData.newPass !== passwordData.confirm) {
      setPasswordError('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      await authApiClient.put('/profile/password', {
        current_password: passwordData.current,
        new_password: passwordData.newPass
      })
      toast.success('Password changed successfully!')
      setPasswordData({ current: '', newPass: '', confirm: '' })
    } catch (error: any) {
      toast.error(getErrorMessage(error) || 'Failed to change password')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    setLoading(true)
    try {
      await authApiClient.delete('/profile')
      toast.success('Account deleted successfully!')
      clearAuth()
      window.location.href = '/'
    } catch (error: any) {
      toast.error(getErrorMessage(error) || 'Failed to delete account')
    } finally {
      setLoading(false)
      setShowDeleteConfirm(false)
    }
  }

  const handleSaveNotifPrefs = () => {
    localStorage.setItem('notification_prefs', JSON.stringify(notifPrefs))
    toast.success('Notification preferences saved')
  }

  // Category management functions
  const fetchCategories = async () => {
    setCategoriesLoading(true)
    try {
      const data = await categoryApi.list()
      setCategories(data || [])
    } catch (error: any) {
      toast.error(getErrorMessage(error) || 'Failed to fetch categories')
    } finally {
      setCategoriesLoading(false)
    }
  }

  const handleCategorySubmit = async () => {
    if (!categoryFormData.name.trim()) {
      toast.error('Category name is required')
      return
    }

    try {
      if (editingCategory?.id) {
        await categoryApi.update(editingCategory.id, categoryFormData)
        toast.success('Category updated successfully')
      } else {
        await categoryApi.create(categoryFormData)
        toast.success('Category created successfully')
      }
      
      fetchCategories()
      resetCategoryForm()
    } catch (error: any) {
      toast.error(getErrorMessage(error) || 'Failed to save category')
    }
  }

  const handleDeleteCategory = async () => {
    if (!deleteTarget) return
    
    try {
      await categoryApi.delete(deleteTarget)
      toast.success('Category deleted successfully')
      fetchCategories()
    } catch (error: any) {
      toast.error(getErrorMessage(error) || 'Failed to delete category')
    } finally {
      setDeleteTarget(null)
    }
  }

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category)
    setCategoryFormData({
      name: category.name,
      type: category.type,
      color: category.color,
      icon: category.icon
    })
    setShowCategoryForm(true)
  }

  const resetCategoryForm = () => {
    setShowCategoryForm(false)
    setEditingCategory(null)
    setCategoryFormData({
      name: '',
      type: 'expense',
      color: '#3B82F6',
      icon: 'folder'
    })
  }

  // Load categories when component mounts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      fetchCategories()
    }
  }, [])

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'categories', label: 'Categories', icon: Tag },
    { id: 'data', label: 'Data & Privacy', icon: Database },
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-64 space-y-2">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? 'secondary' : 'ghost'}
                className="w-full justify-start"
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.label}
              </Button>
            )
          })}
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'profile' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile Settings
                </CardTitle>
                <CardDescription>
                  Update your personal information and preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
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
                    <label htmlFor="image-upload" className="absolute bottom-0 right-0 p-2 bg-white dark:bg-slate-800 rounded-full shadow-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
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

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="full-name">Full Name</Label>
                    <Input 
                      id="full-name" 
                      value={profileData.full_name}
                      onChange={(e) => setProfileData({...profileData, full_name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" value={user?.email || ''} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input 
                      id="phone" 
                      placeholder="+91 1234567890"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Preferred Currency</Label>
                    <Select
                      value={profileData.preferred_currency}
                      onValueChange={(val) => setProfileData({...profileData, preferred_currency: val})}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                        <SelectItem value="USD">USD - US Dollar</SelectItem>
                        <SelectItem value="EUR">EUR - Euro</SelectItem>
                        <SelectItem value="GBP">GBP - British Pound</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Language</Label>
                    <Select
                      value={profileData.preferred_language}
                      onValueChange={(val) => setProfileData({...profileData, preferred_language: val})}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="hi">Hindi</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={handleUpdateProfile} disabled={loading}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              </CardContent>
            </Card>
          )}

          {activeTab === 'appearance' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Appearance
                </CardTitle>
                <CardDescription>
                  Customize how the app looks and feels
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Theme</Label>
                  <p className="text-sm text-muted-foreground mb-3">Select your preferred color scheme</p>
                  <ThemeToggleSettings />
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'notifications' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notification Preferences
                </CardTitle>
                <CardDescription>
                  Choose what notifications you want to receive
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5">
                      <Label>Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive email updates about your account
                      </p>
                    </div>
                    <input type="checkbox" checked={notifPrefs.email} onChange={(e) => setNotifPrefs({ ...notifPrefs, email: e.target.checked })} className="w-4 h-4" />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5">
                      <Label>Budget Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Get notified when you&apos;re close to budget limits
                      </p>
                    </div>
                    <input type="checkbox" checked={notifPrefs.budget} onChange={(e) => setNotifPrefs({ ...notifPrefs, budget: e.target.checked })} className="w-4 h-4" />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5">
                      <Label>Expense Reminders</Label>
                      <p className="text-sm text-muted-foreground">
                        Daily reminders to log your expenses
                      </p>
                    </div>
                    <input type="checkbox" checked={notifPrefs.expense} onChange={(e) => setNotifPrefs({ ...notifPrefs, expense: e.target.checked })} className="w-4 h-4" />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5">
                      <Label>Investment Updates</Label>
                      <p className="text-sm text-muted-foreground">
                        Weekly portfolio performance summaries
                      </p>
                    </div>
                    <input type="checkbox" checked={notifPrefs.investment} onChange={(e) => setNotifPrefs({ ...notifPrefs, investment: e.target.checked })} className="w-4 h-4" />
                  </div>
                </div>
                <Button onClick={handleSaveNotifPrefs}>
                  Save Preferences
                </Button>
              </CardContent>
            </Card>
          )}

          {activeTab === 'security' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security Settings
                </CardTitle>
                <CardDescription>
                  Manage your password and account security
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Current Password</Label>
                    <Input
                      id="current-password"
                      type="password"
                      value={passwordData.current}
                      onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={passwordData.newPass}
                      onChange={(e) => setPasswordData({ ...passwordData, newPass: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={passwordData.confirm}
                      onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
                    />
                  </div>
                  {passwordError && <p className="text-sm text-red-500">{passwordError}</p>}
                </div>
                <Button disabled={loading} onClick={handleChangePassword}>
                  {loading ? 'Changing...' : 'Change Password'}
                </Button>

                <div className="pt-6 border-t">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-0.5">
                        <Label>Two-Factor Authentication</Label>
                        <p className="text-sm text-muted-foreground">
                          Add an extra layer of security to your account
                        </p>
                      </div>
                      <Button variant="outline" size="sm">Enable</Button>
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-0.5">
                        <Label>Active Sessions</Label>
                        <p className="text-sm text-muted-foreground">
                          Manage devices logged into your account
                        </p>
                      </div>
                      <Button variant="outline" size="sm">View</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'categories' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Tag className="h-5 w-5" />
                        Category Management
                      </CardTitle>
                      <CardDescription>
                        Create and manage custom categories for your expenses and income
                      </CardDescription>
                    </div>
                    <Button onClick={() => setShowCategoryForm(true)} className="rounded-xl">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Category
                    </Button>
                  </div>
                </CardHeader>
              </Card>

              {/* Category Form Modal */}
              {showCategoryForm && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                  <Card className="w-full max-w-md">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        {editingCategory ? 'Edit Category' : 'Create Category'}
                        <Button variant="ghost" size="icon" onClick={resetCategoryForm}>
                          <X className="h-4 w-4" />
                        </Button>
                      </CardTitle>
                      <CardDescription>
                        {editingCategory ? 'Update category details' : 'Create a new custom category'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Category Name *</Label>
                        <Input
                          value={categoryFormData.name}
                          onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                          placeholder="e.g., Subscriptions, Groceries"
                          className="rounded-xl"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Type *</Label>
                        <Select value={categoryFormData.type} onValueChange={(val) => setCategoryFormData({ ...categoryFormData, type: val })}>
                          <SelectTrigger className="rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="expense">Expense</SelectItem>
                            <SelectItem value="income">Income</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Icon</Label>
                        <Select value={categoryFormData.icon} onValueChange={(val) => setCategoryFormData({ ...categoryFormData, icon: val })}>
                          <SelectTrigger className="rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="folder">
                              <div className="flex items-center gap-2">
                                <Folder className="h-4 w-4" />
                                Folder
                              </div>
                            </SelectItem>
                            <SelectItem value="utensils">
                              <div className="flex items-center gap-2">
                                <Utensils className="h-4 w-4" />
                                Food
                              </div>
                            </SelectItem>
                            <SelectItem value="car">
                              <div className="flex items-center gap-2">
                                <Car className="h-4 w-4" />
                                Transport
                              </div>
                            </SelectItem>
                            <SelectItem value="shopping">
                              <div className="flex items-center gap-2">
                                <ShoppingBag className="h-4 w-4" />
                                Shopping
                              </div>
                            </SelectItem>
                            <SelectItem value="home">
                              <div className="flex items-center gap-2">
                                <Home className="h-4 w-4" />
                                Home
                              </div>
                            </SelectItem>
                            <SelectItem value="heart">
                              <div className="flex items-center gap-2">
                                <Heart className="h-4 w-4" />
                                Health
                              </div>
                            </SelectItem>
                            <SelectItem value="film">
                              <div className="flex items-center gap-2">
                                <Film className="h-4 w-4" />
                                Entertainment
                              </div>
                            </SelectItem>
                            <SelectItem value="briefcase">
                              <div className="flex items-center gap-2">
                                <Briefcase className="h-4 w-4" />
                                Work
                              </div>
                            </SelectItem>
                            <SelectItem value="trending-up">
                              <div className="flex items-center gap-2">
                                <TrendingUp className="h-4 w-4" />
                                Growth
                              </div>
                            </SelectItem>
                            <SelectItem value="gift">
                              <div className="flex items-center gap-2">
                                <Gift className="h-4 w-4" />
                                Gift
                              </div>
                            </SelectItem>
                            <SelectItem value="more-horizontal">
                              <div className="flex items-center gap-2">
                                <MoreHorizontal className="h-4 w-4" />
                                Other
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Color</Label>
                        <div className="grid grid-cols-4 gap-2">
                          {[
                            { value: '#3B82F6', class: 'bg-blue-500' },
                            { value: '#10B981', class: 'bg-emerald-500' },
                            { value: '#F59E0B', class: 'bg-amber-500' },
                            { value: '#EF4444', class: 'bg-red-500' },
                            { value: '#8B5CF6', class: 'bg-purple-500' },
                            { value: '#EC4899', class: 'bg-pink-500' },
                            { value: '#64748B', class: 'bg-slate-500' },
                            { value: '#F97316', class: 'bg-orange-500' },
                          ].map((color) => (
                            <button
                              key={color.value}
                              onClick={() => setCategoryFormData({ ...categoryFormData, color: color.value })}
                              className={cn(
                                "h-10 rounded-lg border-2 transition-all",
                                categoryFormData.color === color.value
                                  ? 'border-slate-900 dark:border-slate-100 scale-110'
                                  : 'border-transparent'
                              )}
                            >
                              <div className={cn("w-full h-full rounded-md", color.class)} />
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-3 pt-4">
                        <Button variant="outline" onClick={resetCategoryForm} className="rounded-xl flex-1">
                          Cancel
                        </Button>
                        <Button onClick={handleCategorySubmit} className="rounded-xl flex-1">
                          {editingCategory ? 'Update' : 'Create'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Categories List */}
              <div className="space-y-8">
                {/* Expense Categories */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Tag className="h-5 w-5 text-red-500" />
                    Expense Categories
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {categories.filter(cat => cat.type === 'expense').map((category) => {
                      const Icon = getCategoryIcon(category.icon)
                      return (
                        <Card key={category.id} className="group hover:shadow-lg transition-all duration-200">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <div className={cn("p-2 rounded-lg text-white", getCategoryColor(category.color))}>
                                  <Icon className="h-5 w-5" />
                                </div>
                                <div>
                                  <h4 className="font-medium">{category.name}</h4>
                                  <Badge variant="secondary" className="text-xs">
                                    {category.type}
                                  </Badge>
                                </div>
                              </div>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {!category.is_system && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleEditCategory(category)}
                                      className="h-8 w-8"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => setDeleteTarget(category.id)}
                                      className="h-8 w-8 text-red-500 hover:text-red-700"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                            {category.is_system && (
                              <p className="text-xs text-muted-foreground mt-2">System category</p>
                            )}
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </div>

                {/* Income Categories */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    Income Categories
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {categories.filter(cat => cat.type === 'income').map((category) => {
                      const Icon = getCategoryIcon(category.icon)
                      return (
                        <Card key={category.id} className="group hover:shadow-lg transition-all duration-200">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <div className={cn("p-2 rounded-lg text-white", getCategoryColor(category.color))}>
                                  <Icon className="h-5 w-5" />
                                </div>
                                <div>
                                  <h4 className="font-medium">{category.name}</h4>
                                  <Badge variant="default" className="text-xs">
                                    {category.type}
                                  </Badge>
                                </div>
                              </div>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {!category.is_system && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleEditCategory(category)}
                                      className="h-8 w-8"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => setDeleteTarget(category.id)}
                                      className="h-8 w-8 text-red-500 hover:text-red-700"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                            {category.is_system && (
                              <p className="text-xs text-muted-foreground mt-2">System category</p>
                            )}
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'data' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Data Management
                  </CardTitle>
                  <CardDescription>
                    Export, download, or delete your data
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-0.5">
                        <Label>Export All Data</Label>
                        <p className="text-sm text-muted-foreground">
                          Download all your financial data in CSV format
                        </p>
                      </div>
                      <Link href="/dashboard/export">
                        <Button size="sm">Go to Export</Button>
                      </Link>
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-0.5">
                        <Label>Download Statements</Label>
                        <p className="text-sm text-muted-foreground">
                          Get monthly statements for your records
                        </p>
                      </div>
                      <Link href="/dashboard/export">
                        <Button variant="outline" size="sm">Go to Export</Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-red-200">
                <CardHeader>
                  <CardTitle className="text-red-600">Danger Zone</CardTitle>
                  <CardDescription>
                    Irreversible actions that affect your account
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg">
                    <div className="space-y-0.5">
                      <Label className="text-red-600">Delete Account</Label>
                      <p className="text-sm text-muted-foreground">
                        Permanently delete your account and all data
                      </p>
                    </div>
                    <Button variant="destructive" size="sm" onClick={() => setShowDeleteConfirm(true)} disabled={loading}>
                      {loading ? 'Deleting...' : 'Delete Account'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Category"
        description="Are you sure you want to delete this category? This action cannot be undone. Any existing transactions with this category will become uncategorized."
        onConfirm={handleDeleteCategory}
      />

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete Account"
        description="Are you sure you want to permanently delete your account? All your financial data, expenses, EMIs, investments, and budgets will be permanently removed. This action cannot be undone."
        confirmLabel="Delete My Account"
        variant="destructive"
        onConfirm={handleDeleteAccount}
      />
    </div>
  )
}
