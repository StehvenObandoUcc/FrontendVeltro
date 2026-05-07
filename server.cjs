const express = require('express')
const path = require('path')

const app = express()
const port = process.env.PORT || 3000
const distDir = path.join(__dirname, 'dist')

// Serve static assets
app.use(express.static(distDir))

// SPA fallback - serve index.html for all unmatched routes
app.use((req, res) => {
  res.sendFile(path.join(distDir, 'index.html'))
})

app.listen(port, () => {
  console.log(`Server listening on port ${port}`)
})
