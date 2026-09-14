Add-Type -AssemblyName System.Drawing
$taskIconDir = Join-Path $PSScriptRoot '..\extension\icons'
New-Item -ItemType Directory -Path $taskIconDir -Force | Out-Null
foreach ($taskSize in @(16, 32, 48, 128)) {
    $taskCanvas = [System.Drawing.Bitmap]::new(512, 512)
    $taskGraphics = [System.Drawing.Graphics]::FromImage($taskCanvas)
    $taskGraphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $taskGraphics.ScaleTransform(4, 4)
    $taskBackground = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $taskBackground.AddArc(4, 4, 48, 48, 180, 90)
    $taskBackground.AddArc(76, 4, 48, 48, 270, 90)
    $taskBackground.AddArc(76, 76, 48, 48, 0, 90)
    $taskBackground.AddArc(4, 76, 48, 48, 90, 90)
    $taskBackground.CloseFigure()
    $taskBrush = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#00A7E9'))
    $taskGraphics.FillPath($taskBrush, $taskBackground)
    $taskGraphics.TranslateTransform(10, 0)
    $taskSlant = [System.Drawing.Drawing2D.Matrix]::new(1, 0, -0.16, 1, 0, 0)
    $taskGraphics.MultiplyTransform($taskSlant)
    $taskPen = [System.Drawing.Pen]::new([System.Drawing.Color]::White, 10)
    $taskPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $taskPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $taskGraphics.DrawArc($taskPen, 24, 34, 34, 44, 45, 270)
    $taskGraphics.DrawArc($taskPen, 70, 34, 34, 44, 45, 270)
    $taskPen.Width = 6
    $taskGraphics.DrawLine($taskPen, 36, 94, 96, 94)
    $taskGraphics.DrawLine($taskPen, 36, 105, 77, 105)
    $taskOutput = [System.Drawing.Bitmap]::new($taskSize, $taskSize)
    $taskDownsample = [System.Drawing.Graphics]::FromImage($taskOutput)
    $taskDownsample.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $taskDownsample.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $taskDownsample.DrawImage($taskCanvas, 0, 0, $taskSize, $taskSize)
    $taskOutput.Save((Join-Path $taskIconDir "icon-$taskSize.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $taskDownsample.Dispose()
    $taskOutput.Dispose()
    $taskPen.Dispose()
    $taskBrush.Dispose()
    $taskBackground.Dispose()
    $taskSlant.Dispose()
    $taskGraphics.Dispose()
    $taskCanvas.Dispose()
}
