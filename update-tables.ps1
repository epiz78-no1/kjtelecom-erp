$files = @(
    "client\src\pages\IncomingRecords.tsx",
    "client\src\pages\OutgoingRecords.tsx",
    "client\src\pages\TeamMaterialUsage.tsx",
    "client\src\pages\TeamOutgoing.tsx"
)

foreach ($file in $files) {
    $content = Get-Content $file -Raw -Encoding UTF8
    
    # Fix table container for sticky header
    $content = $content -replace 'className="flex-1 min-h-0 rounded-md border overflow-auto"', 'className="flex-1 rounded-md border overflow-hidden">'
    
    # Add inner scroll container
    $content = $content -replace '(<div className="flex-1 rounded-md border overflow-hidden">)\s*(<Table>)', '$1`n        <div className="h-full overflow-auto">`n        $2'
    
    # Close inner scroll container
    $content = $content -replace '(</Table>)\s*(</div>)', '$1`n        </div>`n      $2'
    
    # Change row heights from h-11 to h-9
    $content = $content -replace 'className="h-11"', 'className="h-9"'
    
    $content | Out-File $file -Encoding UTF8 -NoNewline
    Write-Host "Updated: $file"
}

Write-Host "All files updated successfully!"
