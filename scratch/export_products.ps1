$headers = @{
    apikey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuYmFiZmZpZ2hodWd1eHNkdHpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3NDI5NzYsImV4cCI6MjEwMjMxODk3Nn0.AEXQwmXuHcv2l4jQklvNe-U-jauTLD4AsTvVjWXlVPA'
}
$url = 'https://knbabffighhuguxsdtzj.supabase.co/rest/v1/products?select=id,name,name_hindi,barcode,brand,selling_price,wholesale_price,wholesale_min_qty,mrp,purchase_price,image_url,current_stock,price_basis,is_active,created_at&limit=1000&order=name.asc'
$response = Invoke-RestMethod -Uri $url -Headers $headers
$json = $response | ConvertTo-Json -Depth 10
Set-Content -Path 'e:\Falcon\scratch\products_dump.json' -Value $json -Encoding UTF8
Write-Host "Exported $($response.Count) products successfully"
